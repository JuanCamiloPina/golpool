export interface LiveMatch {
  apiMatchId: number
  homeTeam:   string
  awayTeam:   string
  homeScore:  number | null
  awayScore:  number | null
  status:     string
  matchday:   number | null
}

// Translates football-data.org team names to the names stored in our DB
const API_TO_DB_TEAM: Record<string, string> = {
  'Czechia':            'Czech Republic',
  'United States':      'USA',
  'Cape Verde Islands': 'Cape Verde',
  'Congo DR':           'DR Congo',
  'Curaçao':            'Curacao',
  'Korea Republic':     'South Korea',
}

export function mapTeamName(apiName: string): string {
  return API_TO_DB_TEAM[apiName] ?? apiName
}

export function mapApiStatus(apiStatus: string): string {
  if (apiStatus === 'IN_PLAY' || apiStatus === 'PAUSED' || apiStatus === 'LIVE') return 'live'
  if (apiStatus === 'FINISHED') return 'finished'
  return 'scheduled'
}

const ACTIVE_STATUSES = new Set(['LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED'])

export async function fetchLiveMatches(): Promise<LiveMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) throw new Error('FOOTBALL_DATA_API_KEY not set')

  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`football-data.org API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  return ((data.matches ?? []) as Record<string, unknown>[])
    .filter((m) => ACTIVE_STATUSES.has(m.status as string))
    .map((m) => {
      const score = m.score as {
        duration?:    string | null
        fullTime?:    { home?: number | null; away?: number | null } | null
        regularTime?: { home?: number | null; away?: number | null } | null
        extraTime?:   { home?: number | null; away?: number | null } | null
        penalties?:   { home?: number | null; away?: number | null } | null
      } | null
      const ht = m.homeTeam as { name?: string } | null
      const at = m.awayTeam as { name?: string } | null

      const duration = score?.duration ?? 'REGULAR'
      // regularTime = 90-min score, but the API can return {home: null, away: null}
      // instead of omitting the object, so `??` alone won't fall through to fullTime
      let base: { home?: number | null; away?: number | null } | null | undefined
      if (score?.regularTime?.home != null) {
        base = score.regularTime
      } else if (duration === 'PENALTY_SHOOTOUT' && score?.penalties?.home != null && score?.fullTime?.home != null) {
        // regularTime missing: fullTime includes penalties, so strip them back out
        base = {
          home: score.fullTime.home! - score.penalties.home!,
          away: score.fullTime.away! - score.penalties.away!,
        }
      } else {
        // fallback for REGULAR / EXTRA_TIME matches where regularTime is missing
        base = score?.fullTime
      }
      const et = score?.extraTime

      let homeScore: number | null
      let awayScore: number | null

      if (duration === 'EXTRA_TIME') {
        // base = 90-min score, extraTime = goals scored only during ET (not cumulative)
        homeScore = base?.home != null && et?.home != null ? base.home + et.home : base?.home ?? null
        awayScore = base?.away != null && et?.away != null ? base.away + et.away : base?.away ?? null
      } else {
        // REGULAR: base = 90-min result
        // PENALTY_SHOOTOUT: base = 90-min result; penalties excluded per pool rules
        homeScore = base?.home ?? null
        awayScore = base?.away ?? null
      }

      return {
        apiMatchId: m.id as number,
        homeTeam:   ht?.name ?? '',
        awayTeam:   at?.name ?? '',
        homeScore,
        awayScore,
        status:     m.status as string,
        matchday:   m.matchday as number | null,
      }
    })
}
