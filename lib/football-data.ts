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
      const score = m.score as { fullTime?: { home?: number | null; away?: number | null } } | null
      const ht    = m.homeTeam as { name?: string } | null
      const at    = m.awayTeam as { name?: string } | null
      return {
        apiMatchId: m.id as number,
        homeTeam:   ht?.name ?? '',
        awayTeam:   at?.name ?? '',
        homeScore:  score?.fullTime?.home ?? null,
        awayScore:  score?.fullTime?.away ?? null,
        status:     m.status as string,
        matchday:   m.matchday as number | null,
      }
    })
}
