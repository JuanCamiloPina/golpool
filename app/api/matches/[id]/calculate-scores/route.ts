import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { calculateMatchPoints, roundNameToPointsColumn } from '@/lib/scoring'

function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/matches/[id]/calculate-scores'>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: matchId } = await ctx.params
  const admin = createAdminClient()

  // ── Fetch match + round ───────────────────────────────────────
  const { data: match, error: matchErr } = await admin
    .from('matches')
    .select('id, home_score, away_score, round_id, rounds(name, scoring_multiplier)')
    .eq('id', matchId)
    .single()

  if (matchErr || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }
  if (match.home_score === null || match.away_score === null) {
    return NextResponse.json({ error: 'Match has no official result yet' }, { status: 400 })
  }

  const roundData = match.rounds as { name: string; scoring_multiplier: number }[]
  const round = Array.isArray(roundData) ? roundData[0] : roundData as unknown as { name: string; scoring_multiplier: number }
  const pointsColumn = roundNameToPointsColumn(round.name)

  // ── Fetch all predictions for this match ──────────────────────
  const { data: predictions, error: predErr } = await admin
    .from('predictions')
    .select('id, user_id, pool_id, predicted_home_score, predicted_away_score')
    .eq('match_id', matchId)

  if (predErr) return NextResponse.json({ error: predErr.message }, { status: 500 })
  if (!predictions?.length) return NextResponse.json({ updated: 0 })

  // ── Calculate and update each prediction ─────────────────────
  let updated = 0
  const affectedPairs = new Set<string>() // "user_id:pool_id"

  for (const pred of predictions) {
    const pts = calculateMatchPoints(
      pred.predicted_home_score,
      pred.predicted_away_score,
      match.home_score,
      match.away_score,
      round.scoring_multiplier
    )

    await admin
      .from('predictions')
      .update({ points_earned: pts })
      .eq('id', pred.id)

    affectedPairs.add(`${pred.user_id}:${pred.pool_id}`)
    updated++
  }

  // ── Recalculate total_points + per-round column ───────────────
  for (const pair of affectedPairs) {
    const [userId, poolId] = pair.split(':')

    const { data: sumRow } = await admin
      .from('predictions')
      .select('points_earned')
      .eq('user_id', userId)
      .eq('pool_id', poolId)

    const totalPoints = (sumRow ?? []).reduce((s, r) => s + (r.points_earned ?? 0), 0)

    const memberUpdate: Record<string, number> = { total_points: totalPoints }

    if (pointsColumn) {
      const { data: roundSum } = await admin
        .from('predictions')
        .select('points_earned, matches!inner(round_id)')
        .eq('user_id', userId)
        .eq('pool_id', poolId)
        .eq('matches.round_id', match.round_id)

      memberUpdate[pointsColumn] = (roundSum ?? []).reduce((s, r) => s + (r.points_earned ?? 0), 0)
    }

    await admin
      .from('pool_members')
      .update(memberUpdate)
      .eq('user_id', userId)
      .eq('pool_id', poolId)
  }

  // ── Audit log ─────────────────────────────────────────────────
  await admin.from('audit_log').insert({
    user_id:    user.id,
    action:     'calculate_scores',
    table_name: 'predictions',
    record_id:  matchId,
    new_data:   { match: matchId, predictions_updated: updated },
  })

  return NextResponse.json({ updated, pairs: affectedPairs.size })
}
