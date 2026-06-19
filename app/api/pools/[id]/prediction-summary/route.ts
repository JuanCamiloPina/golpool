import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { calculateMatchPoints } from '@/lib/scoring'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllRows(query: any, label: string, maxRows = 50000): Promise<any[]> {
  const allRows: unknown[] = []
  const pageSize = 1000
  let page = 0

  while (allRows.length < maxRows) {
    const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1)
    if (error) { console.error(`[prediction-summary] ${label} page ${page} error:`, error); break }
    if (!data || data.length === 0) break
    allRows.push(...data)
    if (data.length < pageSize) break
    page++
  }

  console.log(`[prediction-summary] ${label}: fetched ${allRows.length} rows (${page + 1} page(s))`)
  return allRows
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params
  const { searchParams } = new URL(req.url)
  const matchId = searchParams.get('match_id')

  if (!matchId) {
    return NextResponse.json({ error: 'match_id required' }, { status: 400 })
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

  const { data: match } = await admin
    .from('matches')
    .select('id, home_team, away_team, match_date, match_time, status, home_score, away_score, round_id')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  const { data: round } = await admin
    .from('rounds')
    .select('id, prediction_deadline, scoring_multiplier')
    .eq('id', match.round_id)
    .single()

  const deadline = round?.prediction_deadline
  if (!deadline || new Date(deadline) > new Date()) {
    return NextResponse.json(
      { error: 'Predictions are hidden until the deadline passes', deadline },
      { status: 403 }
    )
  }

  const [{ count: totalMembers }, predictions] = await Promise.all([
    admin
      .from('pool_members')
      .select('*', { count: 'exact', head: true })
      .eq('pool_id', poolId)
      .eq('status', 'approved'),
    fetchAllRows(
      admin
        .from('predictions')
        .select('user_id, predicted_home_score, predicted_away_score')
        .eq('pool_id', poolId)
        .eq('match_id', matchId),
      'predictions'
    ),
  ])

  type PredRow = { user_id: string; predicted_home_score: number; predicted_away_score: number }
  const preds = predictions as PredRow[]

  const totalPredictions = preds.length
  const didNotPredict    = (totalMembers ?? 0) - totalPredictions

  // Find current user's prediction for badge + personal stats
  const userPred = preds.find(p => p.user_id === user.id) ?? null
  const userPrediction = userPred
    ? { home: userPred.predicted_home_score, away: userPred.predicted_away_score }
    : null

  let homeWinCount = 0, drawCount = 0, awayWinCount = 0
  const scoreMap: Record<string, number> = {}

  for (const p of preds) {
    const h = p.predicted_home_score
    const a = p.predicted_away_score
    scoreMap[`${h}-${a}`] = (scoreMap[`${h}-${a}`] ?? 0) + 1
    if (h > a) homeWinCount++
    else if (h === a) drawCount++
    else awayWinCount++
  }

  const pct = (n: number) =>
    totalPredictions === 0 ? 0 : Math.round((n / totalPredictions) * 100)

  type Outcome = 'home' | 'draw' | 'away'
  const scoreBreakdown = Object.entries(scoreMap)
    .map(([key, count]) => {
      const [h, a] = key.split('-').map(Number)
      const outcome: Outcome = h > a ? 'home' : h === a ? 'draw' : 'away'
      return { home: h, away: a, count, percent: pct(count), outcome }
    })
    .sort((a, b) => b.count - a.count)

  // ── Points stats (only when match has official result) ────────────────────
  const hasResult = match.home_score != null && match.away_score != null

  type VsMedian = 'above' | 'equal' | 'below'
  type YoursStats = { points: number; vsMedian: VsMedian } | null
  type PointsStats = {
    average: number; median: number; top: number; hasResult: boolean; yours: YoursStats
  }

  let pointsStats: PointsStats

  if (hasResult && preds.length > 0) {
    const multiplier = round?.scoring_multiplier ?? 1
    const earned = preds
      .map(p => calculateMatchPoints(
        p.predicted_home_score,
        p.predicted_away_score,
        match.home_score as number,
        match.away_score as number,
        multiplier
      ))
      .sort((a, b) => a - b)

    const sum    = earned.reduce((s, v) => s + v, 0)
    const avg    = Math.round((sum / earned.length) * 10) / 10
    const mid    = Math.floor(earned.length / 2)
    const median = earned.length % 2 === 0
      ? Math.round((earned[mid - 1] + earned[mid]) / 2)
      : earned[mid]
    const top = earned[earned.length - 1]

    let yours: YoursStats = null
    if (userPred) {
      const userPts = calculateMatchPoints(
        userPred.predicted_home_score,
        userPred.predicted_away_score,
        match.home_score as number,
        match.away_score as number,
        multiplier
      )
      const vsMedian: VsMedian = userPts > median ? 'above' : userPts === median ? 'equal' : 'below'
      yours = { points: userPts, vsMedian }
    }

    pointsStats = { average: avg, median, top, hasResult: true, yours }
  } else {
    pointsStats = { average: 0, median: 0, top: 0, hasResult: false, yours: null }
  }

  return NextResponse.json({
    match: {
      id:         match.id,
      home_team:  match.home_team,
      away_team:  match.away_team,
      match_date: match.match_date,
      match_time: match.match_time,
      status:     match.status,
      home_score: match.home_score,
      away_score: match.away_score,
    },
    totalMembers:    totalMembers ?? 0,
    totalPredictions,
    didNotPredict,
    homeWin:  { count: homeWinCount, percent: pct(homeWinCount) },
    draw:     { count: drawCount,    percent: pct(drawCount)    },
    awayWin:  { count: awayWinCount, percent: pct(awayWinCount) },
    scoreBreakdown,
    userPrediction,
    pointsStats,
  })
}
