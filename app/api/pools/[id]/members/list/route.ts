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
      .select('owner_id')
      .eq('id', poolId)
      .single(),
  ])

  const isOwner          = pool?.owner_id === user.id
  const isApprovedMember = membership?.status === 'approved'

  if (!isOwner && !isApprovedMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Fetch members bypassing RLS ───────────────────────────────────────
  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from('pool_members')
    .select('user_id, profiles(full_name)')
    .eq('pool_id', poolId)
    .eq('status', 'approved')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type RawRow = {
    user_id: string
    profiles: { full_name: string }[] | { full_name: string } | null
  }

  const members = (rows ?? []).map((r: unknown) => {
    const row = r as RawRow
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      userId:   row.user_id,
      fullName: p?.full_name ?? '—',
    }
  })

  return NextResponse.json({ members })
}
