import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { fetchLiveMatches, mapTeamName, mapApiStatus } from '@/lib/football-data'

type AdminClient = ReturnType<typeof createAdminClient>

type DBMatch = {
  id: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  status: string
  round_id: number
  api_match_id: number | null
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
  if (req.headers.get('x-cron-secret') === secret) return true
  if (req.headers.get('authorization') === `Bearer ${secret}`) return true
  return false
}

async function findDbMatch(admin: AdminClient, apiMatchId: number, homeTeam: string, awayTeam: string): Promise<{ match: DBMatch | null; matchedBy: 'api_match_id' | 'team_names' | null }> {
  // Primary: match by api_match_id
  const { data: byId } = await admin
    .from('matches')
    .select('id, home_team, away_team, home_score, away_score, status, round_id, api_match_id, rounds(name, scoring_multiplier)')
    .eq('api_match_id', apiMatchId)
    .maybeSingle()

  if (byId) return { match: byId as unknown as DBMatch, matchedBy: 'api_match_id' }

  // Fallback: match by translated team names
  const dbHome = mapTeamName(homeTeam)
  const dbAway = mapTeamName(awayTeam)

  const { data: byTeams } = await admin
    .from('matches')
    .select('id, home_team, away_team, home_score, away_score, status, round_id, api_match_id, rounds(name, scoring_multiplier)')
    .eq('home_team', dbHome)
    .eq('away_team', dbAway)
    .maybeSingle()

  if (byTeams) return { match: byTeams as unknown as DBMatch, matchedBy: 'team_names' }

  return { match: null, matchedBy: null }
}

export async function GET(req: NextRequest) {
  const authedByCron = isCronAuthed(req)

  if (!authedByCron) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const preview = req.nextUrl.searchParams.get('preview') === 'true'
  const admin = createAdminClient()

  const errors: string[] = []
  const updatedMatches: { id: string; homeTeam: string; awayTeam: string; matchedBy: string; changes: Record<string, unknown> }[] = []
  const skipped: { apiMatchId: number; homeTeam: string; awayTeam: string; reason: string }[] = []

  let liveMatches
  try {
    liveMatches = await fetchLiveMatches()
  } catch (err) {
    console.error('[update-scores] Failed to fetch from football-data.org:', String(err))
    return NextResponse.json({ error: String(err), updated: 0, errors: [] }, { status: 500 })
  }

  console.log(`[update-scores] Fetched ${liveMatches.length} active matches from API. preview=${preview}`)

  for (const lm of liveMatches) {
    try {
      const { match, matchedBy } = await findDbMatch(admin, lm.apiMatchId, lm.homeTeam, lm.awayTeam)

      if (!match) {
        const reason = `No DB match for api_match_id=${lm.apiMatchId} (${mapTeamName(lm.homeTeam)} vs ${mapTeamName(lm.awayTeam)})`
        console.log(`[update-scores] SKIP: ${reason}`)
        skipped.push({ apiMatchId: lm.apiMatchId, homeTeam: lm.homeTeam, awayTeam: lm.awayTeam, reason })
        continue
      }

      const newStatus = mapApiStatus(lm.status)
      const scoreChange = match.home_score !== lm.homeScore || match.away_score !== lm.awayScore
      const statusChange = match.status !== newStatus

      if (!scoreChange && !statusChange) {
        skipped.push({ apiMatchId: lm.apiMatchId, homeTeam: lm.homeTeam, awayTeam: lm.awayTeam, reason: 'no change' })
        continue
      }

      const changes: Record<string, unknown> = {
        home_score: lm.homeScore,
        away_score: lm.awayScore,
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      console.log(
        `[update-scores] ${preview ? 'PREVIEW ' : ''}UPDATE match ${match.id} (${match.home_team} vs ${match.away_team})`
        + ` matched_by=${matchedBy}`
        + ` score: ${match.home_score ?? '?'}-${match.away_score ?? '?'} → ${lm.homeScore ?? '?'}-${lm.awayScore ?? '?'}`
        + ` status: ${match.status} → ${newStatus}`
      )

      updatedMatches.push({ id: match.id, homeTeam: match.home_team, awayTeam: match.away_team, matchedBy: matchedBy!, changes })

      if (!preview) {
        await admin.from('matches').update(changes).eq('id', match.id)

        // Stamp api_match_id if we matched via team names (so future lookups use the fast path)
        if (matchedBy === 'team_names' && match.api_match_id == null) {
          await admin.from('matches').update({ api_match_id: lm.apiMatchId }).eq('id', match.id)
          console.log(`[update-scores] Stamped api_match_id=${lm.apiMatchId} on match ${match.id}`)
        }
      }
    } catch (err) {
      const msg = `api_match_id=${lm.apiMatchId} (${lm.homeTeam} vs ${lm.awayTeam}): ${String(err)}`
      console.error(`[update-scores] ERROR: ${msg}`)
      errors.push(msg)
    }
  }

  // Trigger full recalculation if anything was actually updated
  let recalcResult: { predictionsUpdated?: number; membersUpdated?: number } | null = null
  if (!preview && updatedMatches.length > 0) {
    console.log('[update-scores] Triggering recalculate_all_points()...')
    const { data, error: recalcError } = await admin.rpc('recalculate_all_points')
    if (recalcError) {
      const msg = `recalculate_all_points failed: ${recalcError.message}`
      console.error(`[update-scores] ${msg}`)
      errors.push(msg)
    } else {
      type RpcRow = { predictions_updated: number; members_updated: number }
      const row = (data as RpcRow[] | null)?.[0]
      recalcResult = { predictionsUpdated: row?.predictions_updated ?? 0, membersUpdated: row?.members_updated ?? 0 }
      console.log(`[update-scores] Recalc done: ${recalcResult.predictionsUpdated} predictions, ${recalcResult.membersUpdated} members updated`)
    }
  }

  console.log(`[update-scores] Done. updated=${updatedMatches.length} skipped=${skipped.length} errors=${errors.length}`)

  return NextResponse.json({
    preview,
    updated: updatedMatches.length,
    skipped: skipped.length,
    errors,
    matches: updatedMatches,
    skippedDetails: skipped,
    recalc: recalcResult,
  })
}
