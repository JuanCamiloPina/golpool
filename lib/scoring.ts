/**
 * Points for a single match prediction.
 *
 * Base points (group stage, scoring_multiplier = 1):
 *   Correct result (W / D / L)   5 pts
 *   Correct home goals            2 pts
 *   Correct away goals            2 pts
 *   Correct goal difference       1 pt
 *
 * Knockout rounds all use scoring_multiplier = 2, doubling each base value:
 *   Correct result               10 pts
 *   Correct home goals            4 pts
 *   Correct away goals            4 pts
 *   Correct goal difference       2 pts
 *
 * Predictions cover 90 min + extra time; penalty shootout is excluded.
 */
export function calculateMatchPoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  scoringMultiplier: number
): number {
  let base = 0

  const predictedResult = Math.sign(predictedHome - predictedAway)
  const actualResult    = Math.sign(actualHome   - actualAway)
  if (predictedResult === actualResult)                              base += 5
  if (predictedHome === actualHome)                                  base += 2
  if (predictedAway === actualAway)                                  base += 2
  if (Math.abs(predictedHome - predictedAway) === Math.abs(actualHome - actualAway)) base += 1

  return base * scoringMultiplier
}

/** Map a rounds.name string to the pool_members column it contributes to. */
export function roundNameToPointsColumn(roundName: string): string | null {
  const map: Record<string, string> = {
    'Group Stage – Matchday 1': 'points_md1',
    'Group Stage – Matchday 2': 'points_md2',
    'Group Stage – Matchday 3': 'points_md3',
    'Round of 32':              'points_r32',
    'Round of 16':              'points_r16',
    'Quarterfinals':            'points_qf',
    'Semifinals':               'points_sf',
    'Final':                    'points_final',
  }
  return map[roundName] ?? null
}

/** Points awarded for correct bonus predictions. */
export const BONUS_SCORING: Record<string, number> = {
  winner:       40,
  runner_up:    20,
  third_place:  10,
  golden_ball:  10,
  golden_boot:  10,
  golden_glove: 10,
}
