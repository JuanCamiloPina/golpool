'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import PoolTabs from '@/components/PoolTabs'
import { useLang } from '@/components/LanguageContext'
import { getTeamFlagCode } from '@/lib/wc2026-teams'
import FlagImage from '@/components/FlagImage'
import { formatMatchTime, formatDeadlineShort } from '@/lib/date-utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Round {
  id: number
  name: string
  name_es: string
  order_index: number
  prediction_deadline: string | null
}

interface Match {
  id: string
  home_team: string
  away_team: string
  match_date: string
  match_time: string | null
  status: string
  home_score: number | null
  away_score: number | null
}

type Outcome = 'home' | 'draw' | 'away'

interface ScoreLine {
  home: number
  away: number
  count: number
  percent: number
  outcome: Outcome
}

interface PointsStats {
  average: number
  median: number
  top: number
  hasResult: boolean
  yours: { points: number; vsMedian: 'above' | 'equal' | 'below' } | null
}

interface SummaryData {
  match: Match
  totalMembers: number
  totalPredictions: number
  didNotPredict: number
  homeWin: { count: number; percent: number }
  draw: { count: number; percent: number }
  awayWin: { count: number; percent: number }
  scoreBreakdown: ScoreLine[]
  userPrediction: { home: number; away: number } | null
  pointsStats: PointsStats
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const OUTCOME_COLORS: Record<Outcome, string> = {
  home: 'bg-green-500',
  draw: 'bg-blue-500',
  away: 'bg-orange-400',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        Live
      </span>
    )
  }
  if (status === 'finished') {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
        Finished
      </span>
    )
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
      Scheduled
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SummaryPage() {
  const { t, lang } = useLang()
  const router = useRouter()
  const params = useParams()
  const poolId = params.id as string

  const [rounds,          setRounds]          = useState<Round[]>([])
  const [matches,         setMatches]         = useState<Match[]>([])
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [summary,         setSummary]         = useState<SummaryData | null>(null)
  const [locked,          setLocked]          = useState(false)
  const [lockedDeadline,  setLockedDeadline]  = useState<string | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [summaryLoading,  setSummaryLoading]  = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const ts = t.summary

  // ── Auth + rounds ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: membership } = await supabase
        .from('pool_members')
        .select('status')
        .eq('pool_id', poolId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membership || membership.status !== 'approved') {
        router.push(`/pools/${poolId}`)
        return
      }

      const { data: rds } = await supabase
        .from('rounds')
        .select('id, name, name_es, order_index, prediction_deadline')
        .order('order_index', { ascending: true })

      const roundList: Round[] = rds ?? []
      setRounds(roundList)
      setLoading(false)

      if (roundList.length === 0) return

      // Smart default: last round with a passed deadline
      const now = new Date()
      const passed = roundList.filter(r => r.prediction_deadline && new Date(r.prediction_deadline) < now)
      const defaultRound = passed.length > 0 ? passed[passed.length - 1] : null
      if (defaultRound) setSelectedRoundId(defaultRound.id)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId])

  // ── Load matches when round changes ───────────────────────────────────────
  useEffect(() => {
    if (!selectedRoundId) return
    setMatches([])
    setSelectedMatchId(null)
    setSummary(null)
    setLocked(false)

    async function loadMatches() {
      const supabase = createClient()
      const { data: matchData } = await supabase
        .from('matches')
        .select('id, home_team, away_team, match_date, match_time, status, home_score, away_score')
        .eq('round_id', selectedRoundId)
        .order('match_date', { ascending: true })
        .order('match_time', { ascending: true })

      const list: Match[] = matchData ?? []
      setMatches(list)
      if (list.length === 0) return

      // Smart default: live match first, then closest to now
      const now = new Date()
      const live = list.find(m => m.status === 'live')
      if (live) { setSelectedMatchId(live.id); return }

      const sorted = [...list].sort((a, b) =>
        Math.abs(new Date(a.match_date).getTime() - now.getTime()) -
        Math.abs(new Date(b.match_date).getTime() - now.getTime())
      )
      setSelectedMatchId(sorted[0].id)
    }

    loadMatches()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoundId])

  // ── Fetch summary ─────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async (matchId: string) => {
    setSummaryLoading(true)
    const res = await fetch(`/api/pools/${poolId}/prediction-summary?match_id=${matchId}`)
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}))
      setLocked(true)
      setLockedDeadline(body.deadline ?? null)
      setSummary(null)
      setSummaryLoading(false)
      return
    }
    if (!res.ok) { setSummaryLoading(false); return }
    const data: SummaryData = await res.json()
    setSummary(data)
    setLocked(false)
    setSummaryLoading(false)
  }, [poolId])

  useEffect(() => {
    if (!selectedMatchId) return
    fetchSummary(selectedMatchId)
  }, [selectedMatchId, fetchSummary])

  // ── Auto-refresh every 60s (stop when locked) ─────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!selectedMatchId || locked) return
    intervalRef.current = setInterval(() => fetchSummary(selectedMatchId), 60_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [selectedMatchId, locked, fetchSummary])

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedRound = rounds.find(r => r.id === selectedRoundId)
  const roundLabel = (r: Round) => lang === 'es' ? r.name_es : r.name
  const matchLabel = (m: Match) => {
    const time = m.match_time
      ? formatMatchTime(m.match_date, m.match_time, lang)
      : m.match_date
    return `${m.home_team} vs ${m.away_team} · ${time}`
  }

  const maxPct = summary
    ? Math.max(summary.homeWin.percent, summary.draw.percent, summary.awayWin.percent)
    : 0

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded-xl w-56" />
          <div className="h-10 bg-gray-100 rounded-xl" />
          <div className="h-32 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  // ── Outcome card ──────────────────────────────────────────────────────────
  function OutcomeCard({
    label, flagCode, count, percent, highlight,
  }: { label: string; flagCode?: string; count: number; percent: number; highlight: boolean }) {
    return (
      <div className={`flex-1 rounded-xl border-2 p-4 text-center transition-colors ${
        highlight ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-white'
      }`}>
        <div className="text-3xl font-bold text-gray-900">{percent}%</div>
        <div className="mt-1 text-sm font-semibold text-gray-700 flex items-center justify-center gap-1.5">
          {flagCode && <FlagImage countryCode={flagCode} size="20x15" />}
          {label}
        </div>
        <div className="mt-1 text-xs text-gray-500">{count} {ts.predictions}</div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 w-full space-y-6">
      <PoolTabs poolId={poolId} activeTab="summary" />

      <h1 className="text-xl font-bold text-gray-900">📊 {ts.title}</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">{ts.selectRound}</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={selectedRoundId ?? ''}
            onChange={e => setSelectedRoundId(Number(e.target.value))}
          >
            {rounds.map(r => (
              <option key={r.id} value={r.id}>{roundLabel(r)}</option>
            ))}
          </select>
        </div>

        <div className="flex-[2]">
          <label className="block text-xs font-medium text-gray-500 mb-1">{ts.selectMatch}</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={selectedMatchId ?? ''}
            onChange={e => setSelectedMatchId(e.target.value)}
            disabled={matches.length === 0}
          >
            {matches.length === 0 && <option value="">—</option>}
            {matches.map(m => (
              <option key={m.id} value={m.id}>{matchLabel(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Deadline-locked state */}
      {locked && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">{ts.locked}</p>
          {lockedDeadline && (
            <p className="mt-1 text-xs text-gray-400">{formatDeadlineShort(lockedDeadline, lang)}</p>
          )}
        </div>
      )}

      {/* Summary loading skeleton */}
      {summaryLoading && !summary && (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-100 rounded-xl" />
          <div className="h-32 bg-gray-100 rounded-xl" />
          <div className="h-48 bg-gray-100 rounded-xl" />
        </div>
      )}

      {/* Summary content */}
      {summary && !locked && (
        <>
          {/* Match header */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-3 text-lg font-semibold text-gray-900">
              <span className="flex items-center gap-2">
                <FlagImage countryCode={getTeamFlagCode(summary.match.home_team)} size="28x21" />
                {summary.match.home_team}
              </span>
              <span className="text-gray-400 text-sm font-normal">vs</span>
              <span className="flex items-center gap-2">
                <FlagImage countryCode={getTeamFlagCode(summary.match.away_team)} size="28x21" />
                {summary.match.away_team}
              </span>
            </div>
            {summary.match.status === 'finished' && summary.match.home_score != null && (
              <div className="text-2xl font-bold text-gray-900">
                {summary.match.home_score} – {summary.match.away_score}
              </div>
            )}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <StatusBadge status={summary.match.status} />
              {selectedRound?.prediction_deadline && (
                <span className="text-xs text-gray-400">
                  {formatDeadlineShort(selectedRound.prediction_deadline, lang)}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {summary.totalPredictions} {ts.totalPredictions}
              {' · '}
              {summary.totalPredictions} {ts.validScores}
              {' · '}
              {summary.didNotPredict} {ts.didNotPredict}
            </p>
          </div>

          {/* Outcome summary */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">{ts.outcomeSummary}</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <OutcomeCard
                label={ts.homeWin.replace('{team}', summary.match.home_team)}
                flagCode={getTeamFlagCode(summary.match.home_team)}
                count={summary.homeWin.count}
                percent={summary.homeWin.percent}
                highlight={summary.homeWin.percent === maxPct && maxPct > 0}
              />
              <OutcomeCard
                label={ts.draw}
                count={summary.draw.count}
                percent={summary.draw.percent}
                highlight={summary.draw.percent === maxPct && maxPct > 0}
              />
              <OutcomeCard
                label={ts.awayWin.replace('{team}', summary.match.away_team)}
                flagCode={getTeamFlagCode(summary.match.away_team)}
                count={summary.awayWin.count}
                percent={summary.awayWin.percent}
                highlight={summary.awayWin.percent === maxPct && maxPct > 0}
              />
            </div>
          </div>

          {/* Points earned (finished matches only) */}
          {summary.pointsStats.hasResult && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">{ts.pointsEarned}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: ts.pointsAverage, value: summary.pointsStats.average },
                  { label: ts.pointsMedian,  value: summary.pointsStats.median  },
                  { label: ts.pointsTop,     value: summary.pointsStats.top     },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{value}</div>
                    <div className="mt-1 text-xs text-gray-500">{label}</div>
                  </div>
                ))}
                {/* Your Points card */}
                {(() => {
                  const yours = summary.pointsStats.yours
                  const valueColor = yours
                    ? yours.vsMedian === 'above' ? 'text-green-600'
                    : yours.vsMedian === 'equal' ? 'text-blue-600'
                    : 'text-orange-500'
                    : 'text-gray-300'
                  return (
                    <div className="rounded-xl border border-gray-100 bg-white p-4 text-center">
                      <div className={`text-2xl font-bold ${valueColor}`}>
                        {yours ? yours.points : '—'}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {yours ? ts.yourPoints : ts.noPrediction}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Most popular scores */}
          {summary.scoreBreakdown.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">{ts.mostPopular}</h2>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left w-8">#</th>
                      <th className="px-3 py-2 text-left">Score</th>
                      <th className="px-3 py-2 text-right w-16">Count</th>
                      <th className="px-3 py-2 w-36"></th>
                      <th className="px-3 py-2 text-right w-14">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {summary.scoreBreakdown.map((row, i) => (
                      <tr key={`${row.home}-${row.away}`} className="bg-white hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-gray-900">
                            {row.home} – {row.away}
                          </span>
                          {i === 0 && (
                            <span className="ml-2 inline-block text-[10px] font-bold bg-green-100 text-green-700 rounded px-1.5 py-0.5 uppercase tracking-wide">
                              {ts.mostPopularBadge}
                            </span>
                          )}
                          {summary.userPrediction &&
                            summary.userPrediction.home === row.home &&
                            summary.userPrediction.away === row.away && (
                            <span className="ml-2 inline-block text-[10px] font-bold bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 uppercase tracking-wide">
                              {ts.yourPrediction}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums">{row.count}</td>
                        <td className="px-3 py-2.5">
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full ${OUTCOME_COLORS[row.outcome]}`}
                              style={{ width: `${row.percent}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-500 tabular-nums">{row.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {summary.didNotPredict > 0 && (
                <p className="mt-2 text-xs text-gray-400 text-center">
                  {ts.didNotSubmit.replace('{n}', String(summary.didNotPredict))}
                </p>
              )}

              {/* Legend */}
              <div className="mt-3 flex items-center justify-center gap-5 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  {summary.match.home_team}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  {ts.draw}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
                  {summary.match.away_team}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* No round with passed deadline yet */}
      {!loading && !selectedRoundId && !locked && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-500">🔒 {ts.locked}</p>
        </div>
      )}
    </div>
  )
}
