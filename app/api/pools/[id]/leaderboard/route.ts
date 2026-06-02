import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params
  const supabase = await createClient()

  // ── Auth ─────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Verify access: approved member OR pool owner ──────────────────────
  const [{ data: membership }, { data: pool }] = await Promise.all([
    supabase
      .from('pool_members')
      .select('status')
      .eq('pool_id', poolId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('pools')
      .select('name, owner_id')
      .eq('id', poolId)
      .single(),
  ])

  const isOwner          = pool?.owner_id === user.id
  const isApprovedMember = membership?.status === 'approved'

  if (!isOwner && !isApprovedMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Fetch leaderboard data bypassing RLS ──────────────────────────────
  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from('pool_members')
    .select(`
      id, user_id, total_points,
      points_md1, points_md2, points_md3,
      points_r32, points_r16, points_qf, points_sf, points_final,
      profiles(full_name)
    `)
    .eq('pool_id', poolId)
    .eq('status', 'approved')
    .order('total_points', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Flatten the nested profiles join into a single full_name field
  type RawRow = {
    id: string; user_id: string; total_points: number
    points_md1: number; points_md2: number; points_md3: number
    points_r32: number; points_r16: number; points_qf: number
    points_sf: number; points_final: number
    profiles: { full_name: string }[] | { full_name: string } | null
  }

  const members = (rows ?? []).map((r: unknown) => {
    const row = r as RawRow
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id:           row.id,
      user_id:      row.user_id,
      total_points: row.total_points,
      points_md1:   row.points_md1,
      points_md2:   row.points_md2,
      points_md3:   row.points_md3,
      points_r32:   row.points_r32,
      points_r16:   row.points_r16,
      points_qf:    row.points_qf,
      points_sf:    row.points_sf,
      points_final: row.points_final,
      full_name:    p?.full_name ?? '—',
    }
  })

  const userIds = members.map((m) => m.user_id)
  const bonuses: Record<string, string> = {}
  const bonusPoints: Record<string, number> = {}

  if (userIds.length > 0) {
    const { data: bonusRows } = await admin
      .from('bonus_predictions')
      .select('user_id, question, answer, points')
      .eq('pool_id', poolId)
      .in('user_id', userIds)

    for (const b of bonusRows ?? []) {
      if (b.question === 'winner') bonuses[b.user_id] = b.answer
      bonusPoints[b.user_id] = (bonusPoints[b.user_id] ?? 0) + (b.points ?? 0)
    }
  }

  return NextResponse.json({
    poolName: pool?.name ?? '',
    members,
    bonuses,
    bonusPoints,
  })
}
