import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { fetchLiveMatches } from '@/lib/football-data'
import { calculateMatchPoints, roundNameToPointsColumn } from '@/lib/scoring'

type AdminClient = ReturnType<typeof createAdminClient>

type DBMatch = {
  id: string
  home_score: number | null
  away_score: number | null
  status: string
  round_id: number
  rounds: { name: string; scoring_multiplier: number } | { name: string; scoring_multiplier: number }[] | null
}

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

function isCronAuthed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  // Custom header (used by the admin Sync button and direct API calls)
  if (req.headers.get('x-cron-secret') === secret) return true
  // Vercel's built-in cron protection sends Authorization: Bearer {CRON_SECRET}
  if (req.headers.get('authorization') === `Bearer ${secret}`) return true
  return false
}

function mapStatus(apiStatus: string): string {
  if (apiStatus === 'IN_PLAY' || apiStatus === 'PAUSED' || apiStatus === 'LIVE') return 'live'
  if (apiStatus === 'FINISHED') return 'finished'
  return 'scheduled'
}

async function recalcFinishedMatch(
  admin: AdminClient,
  dbMatch: DBMatch,
  homeScore: number,
  awayScore: number
): Promise<void> {
  const roundsData = dbMatch.rounds
  const round = Array.isArray(roundsData) ? roundsData[0] : roundsData
  if (!round) return

  const pointsColumn = roundNameToPointsColumn(round.name)

  const { data: predictions } = await admin
    .from('predictions')
    .select('id, user_id, pool_id, predicted_home_score, predicted_away_score')
    .eq('match_id', dbMatch.id)

  if (!predictions?.length) return

  const affectedPairs = new Set<string>()

  for (const pred of predictions) {
    const pts = calculateMatchPoints(
      pred.predicted_home_score,
      pred.predicted_away_score,
      homeScore,
      awayScore,
      round.scoring_multiplier
    )
    await admin.from('predictions').update({ points_earned: pts }).eq('id', pred.id)
    affectedPairs.add(`${pred.user_id}:${pred.pool_id}`)
  }

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
        .eq('matches.round_id', dbMatch.round_id)

      memberUpdate[pointsColumn] = (roundSum ?? []).reduce((s, r) => s + (r.points_earned ?? 0), 0)
    }

    await admin
      .from('pool_members')
      .update(memberUpdate)
      .eq('user_id', userId)
      .eq('pool_id', poolId)
  }
}

export async function GET(req: NextRequest) {
  // Accept cron secret header OR admin user session
  const authedByCron = isCronAuthed(req)

  if (!authedByCron) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = createAdminClient()
  const errors: string[] = []
  let updated = 0
  let finished = 0

  let liveMatches
  try {
    liveMatches = await fetchLiveMatches()
  } catch (err) {
    return NextResponse.json({ error: String(err), updated: 0, finished: 0, errors: [] }, { status: 500 })
  }

  for (const lm of liveMatches) {
    try {
      // NOTE: requires api_match_id column on matches table.
      // Run: ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS api_match_id integer;
      // Then populate it from the football-data.org match IDs.
      const { data: dbMatch } = await admin
        .from('matches')
        .select('id, home_score, away_score, status, round_id, rounds(name, scoring_multiplier)')
        .eq('api_match_id', lm.apiMatchId)
        .maybeSingle()

      if (!dbMatch) continue

      const match = dbMatch as unknown as DBMatch
      const newStatus   = mapStatus(lm.status)
      const scoreChange = match.home_score !== lm.homeScore || match.away_score !== lm.awayScore
      const statusChange = match.status !== newStatus

      if (!scoreChange && !statusChange) continue

      await admin.from('matches').update({
        home_score:  lm.homeScore,
        away_score:  lm.awayScore,
        status:      newStatus,
        updated_at:  new Date().toISOString(),
      }).eq('id', match.id)

      updated++

      // Trigger score calculation when a match first reaches "finished" with a result
      const justFinished = newStatus === 'finished' && match.status !== 'finished'
      if (justFinished && lm.homeScore !== null && lm.awayScore !== null) {
        await recalcFinishedMatch(admin, match, lm.homeScore, lm.awayScore)
        finished++
      }
    } catch (err) {
      errors.push(`api_match_id=${lm.apiMatchId}: ${String(err)}`)
    }
  }

  return NextResponse.json({ updated, finished, errors })
}
