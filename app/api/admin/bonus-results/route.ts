import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { BONUS_SCORING } from '@/lib/scoring'

function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

async function recalculateMemberTotals(
  admin: ReturnType<typeof createAdminClient>,
  pairs: { user_id: string; pool_id: string; bonus: number }[]
) {
  for (const { user_id, pool_id, bonus } of pairs) {
    const { data: member } = await admin
      .from('pool_members')
      .select('points_md1, points_md2, points_md3, points_r32, points_r16, points_qf, points_sf, points_final')
      .eq('user_id', user_id)
      .eq('pool_id', pool_id)
      .maybeSingle()

    if (!member) continue

    const total =
      (member.points_md1    ?? 0) + (member.points_md2  ?? 0) + (member.points_md3   ?? 0) +
      (member.points_r32    ?? 0) + (member.points_r16  ?? 0) + (member.points_qf    ?? 0) +
      (member.points_sf     ?? 0) + (member.points_final ?? 0) + bonus

    await admin
      .from('pool_members')
      .update({ total_points: total })
      .eq('user_id', user_id)
      .eq('pool_id', pool_id)
  }
}

// GET — fetch current official bonus results (any authenticated user)
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('official_bonus_results')
    .select('*')
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ results: data ?? null })
}

// POST — save official results and recalculate all bonus_predictions.points_earned + pool_members.total_points
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as {
    winner?: string; runner_up?: string; third_place?: string
    golden_ball?: string; golden_boot?: string; golden_glove?: string
  }

  const { winner = '', runner_up = '', third_place = '', golden_ball = '', golden_boot = '', golden_glove = '' } = body

  const admin = createAdminClient()

  // 1. Upsert the singleton official_bonus_results row
  const { data: existing } = await admin
    .from('official_bonus_results')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (existing) {
    await admin
      .from('official_bonus_results')
      .update({ winner, runner_up, third_place, golden_ball, golden_boot, golden_glove, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await admin
      .from('official_bonus_results')
      .insert({ winner, runner_up, third_place, golden_ball, golden_boot, golden_glove })
  }

  // 2. Recalculate bonus_predictions.points_earned for ALL users across ALL pools
  const { error: resetErr } = await admin
    .from('bonus_predictions')
    .update({ points_earned: 0 })
    .not('pool_id', 'is', null)

  if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 500 })

  const officialAnswers: Record<string, string> = {
    winner, runner_up, third_place, golden_ball, golden_boot, golden_glove,
  }

  let totalAwarded = 0

  for (const [question, officialAnswer] of Object.entries(officialAnswers)) {
    if (!officialAnswer.trim()) continue
    const pts = BONUS_SCORING[question] ?? 0
    if (pts === 0) continue

    const { data: awarded } = await admin
      .from('bonus_predictions')
      .update({ points_earned: pts })
      .eq('question', question)
      .eq('answer', officialAnswer.trim())
      .select('user_id')

    totalAwarded += awarded?.length ?? 0
  }

  // 3. Recalculate pool_members.total_points for all users who have bonus_predictions
  const { data: bonusPairs } = await admin
    .from('bonus_predictions')
    .select('user_id, pool_id, points_earned')
    .not('pool_id', 'is', null)

  if (bonusPairs && bonusPairs.length > 0) {
    const bonusSums = new Map<string, { user_id: string; pool_id: string; bonus: number }>()
    for (const row of bonusPairs) {
      const key = `${row.user_id}:${row.pool_id}`
      const entry = bonusSums.get(key) ?? { user_id: row.user_id, pool_id: row.pool_id, bonus: 0 }
      entry.bonus += (row.points_earned as number | null) ?? 0
      bonusSums.set(key, entry)
    }
    await recalculateMemberTotals(admin, Array.from(bonusSums.values()))
  }

  // Recalculate all match prediction points + member totals so total_points reflects bonus
  const { error: rpcError } = await admin.rpc('recalculate_all_points')
  if (rpcError) console.error('[bonus-results] recalculate_all_points error:', rpcError)

  // 4. Audit log
  await admin.from('audit_log').insert({
    user_id:    user.id,
    action:     'save_official_bonus_results',
    table_name: 'official_bonus_results',
    new_data:   { saved_by: user.email, winner, runner_up, third_place, golden_ball, golden_boot, golden_glove, total_awarded: totalAwarded },
  })

  return NextResponse.json({ ok: true, totalAwarded })
}

// DELETE — clear official results, reset all bonus points, recalculate totals
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  // 1. Collect affected (user_id, pool_id) pairs before resetting
  const { data: bonusPairs } = await admin
    .from('bonus_predictions')
    .select('user_id, pool_id')
    .not('pool_id', 'is', null)

  const uniquePairs = Array.from(
    new Map((bonusPairs ?? []).map((p) => [`${p.user_id}:${p.pool_id}`, p])).values()
  ).map((p) => ({ user_id: p.user_id, pool_id: p.pool_id, bonus: 0 }))

  // 2. Null out the official_bonus_results singleton
  const { data: existing } = await admin
    .from('official_bonus_results')
    .select('id')
    .limit(1)
    .maybeSingle()

  if (existing) {
    await admin
      .from('official_bonus_results')
      .update({
        winner: null, runner_up: null, third_place: null,
        golden_ball: null, golden_boot: null, golden_glove: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  }

  // 3. Reset all bonus_predictions.points_earned to 0
  const { error: resetErr } = await admin
    .from('bonus_predictions')
    .update({ points_earned: 0 })
    .not('pool_id', 'is', null)

  if (resetErr) return NextResponse.json({ error: resetErr.message }, { status: 500 })

  // 4. Recalculate pool_members.total_points (bonus is now 0 for all)
  await recalculateMemberTotals(admin, uniquePairs)

  // 5. Audit log
  await admin.from('audit_log').insert({
    user_id:    user.id,
    action:     'clear_official_bonus_results',
    table_name: 'official_bonus_results',
    new_data:   { cleared_by: user.email },
  })

  return NextResponse.json({ ok: true })
}
