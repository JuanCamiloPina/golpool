import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params
  const { searchParams } = new URL(req.url)
  const roundId = searchParams.get('round_id')

  if (!roundId) {
    return NextResponse.json({ error: 'round_id required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: membership }, { data: pool }] = await Promise.all([
    supabase
      .from('pool_members')
      .select('status')
      .eq('pool_id', poolId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('pools')
      .select('owner_id, name')
      .eq('id', poolId)
      .single(),
  ])

  const isOwner          = pool?.owner_id === user.id
  const isApprovedMember = membership?.status === 'approved'
  if (!isOwner && !isApprovedMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: round } = await admin
    .from('rounds')
    .select('id, name, name_es, prediction_deadline, scoring_multiplier')
    .eq('id', Number(roundId))
    .single()

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const deadline = round.prediction_deadline
  if (!deadline || new Date(deadline) > new Date()) {
    return NextResponse.json({ error: 'Export only available after round deadline' }, { status: 403 })
  }

  // Fetch members, matches, and bonus predictions in parallel
  const [{ data: memberRows }, { data: matchData }, { data: bonusPredRows }] = await Promise.all([
    admin
      .from('pool_members')
      .select('user_id, total_points, points_md1, points_md2, points_md3, points_r32, points_r16, points_qf, points_sf, points_final, profiles(full_name, email)')
      .eq('pool_id', poolId)
      .eq('status', 'approved')
      .order('total_points', { ascending: false }),
    admin
      .from('matches')
      .select('id, group_name, home_team, away_team, match_date, match_time, home_score, away_score, status')
      .eq('round_id', Number(roundId))
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true }),
    admin
      .from('bonus_predictions')
      .select('user_id, points_earned')
      .eq('pool_id', poolId),
  ])

  const matchIds = (matchData ?? []).map((m: { id: string }) => m.id)

  // Only query predictions if there are matches
  const predictions = matchIds.length > 0
    ? (await admin
        .from('predictions')
        .select('user_id, match_id, predicted_home_score, predicted_away_score, points_earned')
        .eq('pool_id', poolId)
        .in('match_id', matchIds)
      ).data ?? []
    : []

  type RawMemberRow = {
    user_id: string
    total_points: number
    points_md1: number; points_md2: number; points_md3: number
    points_r32: number; points_r16: number; points_qf: number
    points_sf: number; points_final: number
    profiles: { full_name: string; email: string }[] | { full_name: string; email: string } | null
  }

  // Build bonus points map from bonus_predictions
  const bonusMap: Record<string, number> = {}
  for (const row of bonusPredRows ?? []) {
    const r = row as { user_id: string; points_earned: number | null }
    bonusMap[r.user_id] = (bonusMap[r.user_id] ?? 0) + (r.points_earned ?? 0)
  }

  const members = (memberRows ?? []).map((r: unknown) => {
    const row = r as RawMemberRow
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      userId:       row.user_id,
      fullName:     p?.full_name ?? '—',
      email:        p?.email ?? '',
      totalPoints:  row.total_points ?? 0,
      bonusPoints:  bonusMap[row.user_id] ?? 0,
      pointsMd1:    row.points_md1 ?? 0,
      pointsMd2:    row.points_md2 ?? 0,
      pointsMd3:    row.points_md3 ?? 0,
      pointsR32:    row.points_r32 ?? 0,
      pointsR16:    row.points_r16 ?? 0,
      pointsQf:     row.points_qf ?? 0,
      pointsSf:     row.points_sf ?? 0,
      pointsFinal:  row.points_final ?? 0,
    }
  })

  return NextResponse.json({
    poolName:    pool?.name ?? '',
    isAdmin:     isOwner,
    round: {
      name:               round.name,
      name_es:            round.name_es,
      scoring_multiplier: round.scoring_multiplier,
    },
    members,
    matches:     matchData ?? [],
    predictions,
  })
}
