import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { roundNameToPointsColumn } from '@/lib/scoring'

function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({})) as { round_id?: number }
  const roundId = typeof body.round_id === 'number' ? body.round_id : null
  const admin = createAdminClient()

  // ── Clear a single round ────────────────────────────────────────────────────
  if (roundId !== null) {
    const [{ data: roundData }, { data: roundMatches, error: matchListErr }] = await Promise.all([
      admin.from('rounds').select('name').eq('id', roundId).single(),
      admin.from('matches').select('id').eq('round_id', roundId),
    ])

    if (matchListErr) return NextResponse.json({ error: matchListErr.message }, { status: 500 })

    const matchIds = (roundMatches ?? []).map((m: { id: string }) => m.id)

    // Clear match scores for this round
    if (matchIds.length > 0) {
      const { error: clearErr } = await admin
        .from('matches')
        .update({ home_score: null, away_score: null, status: 'scheduled' })
        .in('id', matchIds)
      if (clearErr) return NextResponse.json({ error: clearErr.message }, { status: 500 })
    }

    // Reset predictions.points_earned for these matches and collect affected user/pool pairs
    const { data: affectedPreds, error: predErr } = await admin
      .from('predictions')
      .update({ points_earned: 0 })
      .in('match_id', matchIds.length > 0 ? matchIds : ['__none__'])
      .select('user_id, pool_id')

    if (predErr) return NextResponse.json({ error: predErr.message }, { status: 500 })

    const affectedPairs = new Set(
      (affectedPreds ?? []).map((p: { user_id: string; pool_id: string }) => `${p.user_id}:${p.pool_id}`)
    )
    const pointsColumn = roundNameToPointsColumn(roundData?.name ?? '')

    // Recalculate totals for each affected user/pool
    for (const pair of affectedPairs) {
      const [userId, poolId] = pair.split(':')

      const { data: allPreds } = await admin
        .from('predictions')
        .select('points_earned')
        .eq('user_id', userId)
        .eq('pool_id', poolId)

      const newTotal = (allPreds ?? []).reduce(
        (s: number, r: { points_earned: number | null }) => s + (r.points_earned ?? 0),
        0
      )

      const memberUpdate: Record<string, number> = { total_points: newTotal }
      if (pointsColumn) memberUpdate[pointsColumn] = 0

      await admin
        .from('pool_members')
        .update(memberUpdate)
        .eq('user_id', userId)
        .eq('pool_id', poolId)
    }

    await admin.from('audit_log').insert({
      user_id:    user.id,
      action:     'clear_round_results',
      table_name: 'matches',
      new_data: {
        cleared_by:        user.email,
        round_id:          roundId,
        round_name:        roundData?.name,
        matches_cleared:   matchIds.length,
        predictions_reset: affectedPreds?.length ?? 0,
        members_updated:   affectedPairs.size,
      },
    })

    return NextResponse.json({
      ok:               true,
      matchesCleared:   matchIds.length,
      predictionsReset: affectedPreds?.length ?? 0,
      membersUpdated:   affectedPairs.size,
    })
  }

  // ── Clear ALL results ───────────────────────────────────────────────────────

  // 1. Clear all match scores
  const { error: matchClearErr } = await admin
    .from('matches')
    .update({ home_score: null, away_score: null, status: 'scheduled' })
    .not('id', 'is', null)

  if (matchClearErr) return NextResponse.json({ error: matchClearErr.message }, { status: 500 })

  // 2. Reset all predictions points_earned to 0
  const { data: resetPreds, error: predResetErr } = await admin
    .from('predictions')
    .update({ points_earned: 0 })
    .not('pool_id', 'is', null)
    .select('id')

  if (predResetErr) return NextResponse.json({ error: predResetErr.message }, { status: 500 })

  // 3. Reset all pool_members point columns to 0
  const { data: resetMembers, error: memberResetErr } = await admin
    .from('pool_members')
    .update({
      total_points:  0,
      points_md1:    0,
      points_md2:    0,
      points_md3:    0,
      points_r32:    0,
      points_r16:    0,
      points_qf:     0,
      points_sf:     0,
      points_final:  0,
    })
    .not('pool_id', 'is', null)
    .select('id')

  if (memberResetErr) return NextResponse.json({ error: memberResetErr.message }, { status: 500 })

  // 4. Reset all bonus_predictions points_earned to 0
  const { data: resetBonus, error: bonusResetErr } = await admin
    .from('bonus_predictions')
    .update({ points_earned: 0 })
    .not('pool_id', 'is', null)
    .select('pool_id')

  if (bonusResetErr) return NextResponse.json({ error: bonusResetErr.message }, { status: 500 })

  // 5. Audit log
  await admin.from('audit_log').insert({
    user_id:    user.id,
    action:     'clear_all_results',
    table_name: 'matches',
    new_data: {
      cleared_by:        user.email,
      predictions_reset: resetPreds?.length ?? 0,
      members_reset:     resetMembers?.length ?? 0,
      bonus_reset:       resetBonus?.length ?? 0,
    },
  })

  return NextResponse.json({
    ok:               true,
    predictionsReset: resetPreds?.length ?? 0,
    membersReset:     resetMembers?.length ?? 0,
    bonusReset:       resetBonus?.length ?? 0,
  })
}
