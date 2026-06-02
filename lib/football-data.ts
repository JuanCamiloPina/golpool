export interface LiveMatch {
  apiMatchId: number
  homeScore: number | null
  awayScore: number | null
  status: string
  matchday: number | null
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
      return {
        apiMatchId: m.id as number,
        homeScore:  score?.fullTime?.home  ?? null,
        awayScore:  score?.fullTime?.away  ?? null,
        status:     m.status as string,
        matchday:   m.matchday as number | null,
      }
    })
}
