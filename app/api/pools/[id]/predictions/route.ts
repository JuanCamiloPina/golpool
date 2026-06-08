import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

interface PredictionRow {
  user_id: string
  pool_id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/pools/[id]/predictions'>
) {
  const { id: poolId } = await ctx.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership } = await supabase
    .from('pool_members')
    .select('status')
    .eq('pool_id', poolId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || membership.status !== 'approved') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { rows, round_id } = body as { rows: PredictionRow[]; round_id: number }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: round } = await admin
    .from('rounds')
    .select('prediction_deadline')
    .eq('id', round_id)
    .single()

  if (round?.prediction_deadline && new Date(round.prediction_deadline) <= new Date()) {
    return NextResponse.json({ error: 'Round is closed' }, { status: 403 })
  }

  // Fetch existing predictions for audit diff
  const matchIds = rows.map((r) => r.match_id)
  const { data: oldPreds } = await admin
    .from('predictions')
    .select('match_id, predicted_home_score, predicted_away_score')
    .eq('pool_id', poolId)
    .eq('user_id', user.id)
    .in('match_id', matchIds)

  const oldMap: Record<string, { home: number | null; away: number | null }> = {}
  for (const p of oldPreds ?? []) {
    oldMap[p.match_id] = { home: p.predicted_home_score, away: p.predicted_away_score }
  }

  // Upsert predictions (force correct user_id/pool_id from session)
  const safeRows = rows.map((r) => ({
    user_id:              user.id,
    pool_id:              poolId,
    match_id:             r.match_id,
    predicted_home_score: r.predicted_home_score,
    predicted_away_score: r.predicted_away_score,
  }))

  const { error: upsertError } = await admin
    .from('predictions')
    .upsert(safeRows, { onConflict: 'user_id,pool_id,match_id' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // Build change diff for audit log
  const changes = safeRows
    .map((r) => {
      const old = oldMap[r.match_id]
      const entry: Record<string, unknown> = {
        match_id: r.match_id,
        new: { home: r.predicted_home_score, away: r.predicted_away_score },
      }
      if (old) entry.old = { home: old.home, away: old.away }
      return entry
    })
    .filter((c) => {
      const o = c.old as { home: number | null; away: number | null } | undefined
      const n = c.new as { home: number; away: number }
      if (!o) return true
      return o.home !== n.home || o.away !== n.away
    })

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null

  await admin.from('audit_log').insert({
    user_id:    user.id,
    action:     'prediction_save',
    table_name: 'predictions',
    record_id:  poolId,
    pool_id:    poolId,
    old_data:   { predictions: oldPreds ?? [] },
    new_data:   { predictions: safeRows },
    payload:    { round_id, match_count: safeRows.length, changes },
    ip_address: ip,
  })

  return NextResponse.json({ ok: true })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params
  const { searchParams } = new URL(req.url)
  const roundId    = searchParams.get('round_id')
  const targetUid  = searchParams.get('user_id')

  if (!roundId || !targetUid) {
    return NextResponse.json({ error: 'round_id and user_id required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: membership }, { data: pool }] = await Promise.all([
    supabase.from('pool_members').select('status').eq('pool_id', poolId).eq('user_id', user.id).maybeSingle(),
    supabase.from('pools').select('owner_id').eq('id', poolId).single(),
  ])

  const isOwner          = pool?.owner_id === user.id
  const isApprovedMember = membership?.status === 'approved'
  if (!isOwner && !isApprovedMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  console.log(`[predictions GET] poolId=${poolId} roundId=${roundId} targetUid=${targetUid} requestingUid=${user.id}`)

  // Other users' predictions only visible after the round deadline has passed.
  // Only block when a deadline exists AND is still in the future.
  if (targetUid !== user.id) {
    const { data: round } = await admin
      .from('rounds')
      .select('prediction_deadline')
      .eq('id', Number(roundId))
      .single()

    const dl = round?.prediction_deadline
    console.log(`[predictions GET] round deadline=${dl ?? 'none'}`)

    if (dl && new Date(dl) > new Date()) {
      console.log('[predictions GET] blocked — deadline not yet passed')
      return NextResponse.json({ error: 'Not yet visible' }, { status: 403 })
    }
  }

  const { data: preds, error } = await admin
    .from('predictions')
    .select('match_id, predicted_home_score, predicted_away_score, points_earned')
    .eq('pool_id', poolId)
    .eq('user_id', targetUid)

  if (error) {
    console.log('[predictions GET] query error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[predictions GET] returning ${preds?.length ?? 0} predictions`)
  return NextResponse.json({ predictions: preds ?? [] })
}
