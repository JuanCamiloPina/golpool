'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'
import { getTeamName, getTeamFlagCode } from '@/lib/wc2026-teams'
import FlagImage from '@/components/FlagImage'

interface Round {
  id: number
  name: string
  name_es: string
  prediction_deadline: string | null
  scoring_multiplier: number
}

interface Match {
  id: string
  group_name: string | null
  home_team: string
  away_team: string
  match_date: string
  venue: string
  home_score: number | null
  away_score: number | null
  status: string
}

interface Prediction { home: string; away: string }
interface Member { userId: string; fullName: string }

// ── Scoring breakdown ────────────────────────────────────────────────────────
function calcBreakdown(ph: number, pa: number, ah: number, aa: number, mul: number) {
  const result = Math.sign(ph - pa) === Math.sign(ah - aa)
  const homeG  = ph === ah
  const awayG  = pa === aa
  const diff   = (ph - pa) === (ah - aa)
  return {
    result, homeG, awayG, diff,
    resultPts: (result ? 5 : 0) * mul,
    homePts:   (homeG  ? 2 : 0) * mul,
    awayPts:   (awayG  ? 2 : 0) * mul,
    diffPts:   (diff   ? 1 : 0) * mul,
    total:     ((result ? 5 : 0) + (homeG ? 2 : 0) + (awayG ? 2 : 0) + (diff ? 1 : 0)) * mul,
  }
}

function useCountdown(deadline: string | null) {
  const [label, setLabel] = useState('')
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    if (!deadline) return
    function tick() {
      const diff = new Date(deadline!).getTime() - Date.now()
      if (diff <= 0) { setClosed(true); setLabel(''); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLabel(d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  return { label, closed }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/New_York', timeZoneName: 'short',
  })
}

function StatusBadge({ match, tp }: { match: Match; tp: ReturnType<typeof useTranslations> }) {
  if (match.status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        {tp.statusLive}
      </span>
    )
  }
  if (match.home_score !== null) {
    return (
      <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
        {tp.statusFinished}
      </span>
    )
  }
  return (
    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
      {tp.statusUpcoming}
    </span>
  )
}

// Helper to capture t.predict type
function useTranslations() {
  const { t } = useLang()
  return t.predict
}

export default function PredictPage() {
  const { t, lang } = useLang()
  const tp = t.predict
  const router = useRouter()
  const params = useParams()
  const poolId = params.id as string

  const [rounds, setRounds]           = useState<Round[]>([])
  const [selectedRound, setRound]     = useState<Round | null>(null)
  const [matches, setMatches]         = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [isEditing, setIsEditing]     = useState(false)
  const [invalidMatchIds, setInvalidIds] = useState<Set<string>>(new Set())
  const [loading, setLoading]         = useState(true)
  const [loadingMatches, setLM]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saveMsg, setSaveMsg]         = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [userId, setUserId]           = useState<string | null>(null)

  // Viewer state
  const [members, setMembers]             = useState<Member[]>([])
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [viewingName, setViewingName]     = useState<string | null>(null)

  const { label: countdown, closed } = useCountdown(selectedRound?.prediction_deadline ?? null)

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

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
        .select('id, name, name_es, prediction_deadline, scoring_multiplier')
        .order('order_index', { ascending: true })

      setRounds(rds ?? [])
      setRound((rds ?? [])[0] ?? null)
      setLoading(false)
    }
    init()
  }, [poolId, router])

  // ── Load members once deadline passes ─────────────────────────────────────
  useEffect(() => {
    if (!closed || !poolId) return
    fetch(`/api/pools/${poolId}/members/list`)
      .then((r) => r.ok ? r.json() : { members: [] })
      .then((d) => setMembers(d.members ?? []))
  }, [closed, poolId])

  // ── Load matches + predictions for the selected round ────────────────────
  const loadMatches = useCallback(async (round: Round, forUserId?: string) => {
    if (!userId) return
    setLM(true)
    setIsEditing(false)
    setInvalidIds(new Set())

    // Reset viewing when changing rounds without a specific viewer
    if (!forUserId) {
      setViewingUserId(null)
      setViewingName(null)
    }

    const supabase = createClient()
    const { data: matchData } = await supabase
      .from('matches')
      .select('id, group_name, home_team, away_team, match_date, venue, home_score, away_score, status')
      .eq('round_id', round.id)
      .order('match_date', { ascending: true })

    const matchIds = (matchData ?? []).map((m) => m.id)
    const targetId = forUserId ?? userId
    const predMap: Record<string, Prediction> = {}

    if (targetId === userId) {
      const { data: predData } = await supabase
        .from('predictions')
        .select('match_id, predicted_home_score, predicted_away_score')
        .eq('pool_id', poolId)
        .eq('user_id', userId)
        .in('match_id', matchIds)

      for (const p of predData ?? []) {
        predMap[p.match_id] = {
          home: p.predicted_home_score?.toString() ?? '',
          away: p.predicted_away_score?.toString() ?? '',
        }
      }
    } else {
      const res = await fetch(
        `/api/pools/${poolId}/predictions?round_id=${round.id}&user_id=${targetId}`
      )
      if (res.ok) {
        const data = await res.json()
        for (const p of data.predictions ?? []) {
          predMap[p.match_id] = {
            home: p.predicted_home_score?.toString() ?? '',
            away: p.predicted_away_score?.toString() ?? '',
          }
        }
      }
    }

    setMatches((matchData ?? []) as Match[])
    setPredictions(predMap)
    setLM(false)
  }, [poolId, userId])

  useEffect(() => {
    if (selectedRound && userId) loadMatches(selectedRound)
  }, [selectedRound, userId, loadMatches])

  // ── Save predictions ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!userId || !selectedRound || closed) return

    const scheduled = matches.filter((m) => m.status === 'scheduled')
    const missing = new Set(
      scheduled
        .filter((m) => {
          const p = predictions[m.id] ?? { home: '', away: '' }
          return p.home === '' || p.away === ''
        })
        .map((m) => m.id)
    )

    if (missing.size > 0) {
      setInvalidIds(missing)
      setError(tp.incompleteError)
      return
    }

    setSaving(true); setError(null); setSaveMsg(null); setInvalidIds(new Set())

    const rows = scheduled.map((m) => {
      const p = predictions[m.id]!
      return {
        user_id:              userId,
        pool_id:              poolId,
        match_id:             m.id,
        predicted_home_score: Number(p.home),
        predicted_away_score: Number(p.away),
      }
    })

    const res = await fetch(`/api/pools/${poolId}/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, round_id: selectedRound.id }),
    })
    const upsertError = res.ok ? null : await res.json().then((d: { error?: string }) => ({ message: d.error ?? 'Save failed' }))

    setSaving(false)
    if (upsertError) {
      setError(upsertError.message)
    } else {
      setSaveMsg(tp.saved)
      setIsEditing(false)
      setTimeout(() => setSaveMsg(null), 2000)
    }
  }

  const mul = selectedRound?.scoring_multiplier ?? 1
  const isGroupStage = selectedRound ? selectedRound.id <= 3 : true
  const isViewingOther = !!viewingUserId

  // Round summary computed client-side
  const finishedMatches = matches.filter((m) => m.home_score !== null)
  const roundPoints = finishedMatches.reduce((sum, m) => {
    const pred = predictions[m.id]
    if (!pred || pred.home === '' || pred.away === '') return sum
    return sum + calcBreakdown(
      parseInt(pred.home, 10), parseInt(pred.away, 10),
      m.home_score!, m.away_score!, mul
    ).total
  }, 0)

  const byGroup: Record<string, Match[]> = {}
  for (const m of matches) {
    const g = m.group_name ?? '—'
    if (!byGroup[g]) byGroup[g] = []
    byGroup[g].push(m)
  }

  const tabs = [
    { label: t.tabs.predict,   href: `/pools/${poolId}/predict`     },
    { label: t.tabs.bonus,     href: `/pools/${poolId}/bonus`       },
    { label: t.tabs.standings, href: `/pools/${poolId}/leaderboard` },
    { label: t.tabs.poolInfo,  href: `/pools/${poolId}`             },
  ]

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded-xl w-48" />
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">

      {/* Back + nav tabs */}
      <div>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          {tp.back}
        </Link>
        <div className="flex gap-1 border-b border-gray-100 mt-4 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                tab.href === `/pools/${poolId}/predict`
                  ? 'border-green-500 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-green-700 hover:border-green-400'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{tp.title}</h1>
          {selectedRound?.prediction_deadline && (
            <div className="text-sm mt-0.5">
              {closed ? (
                <span className="font-medium text-red-600">{tp.closed}</span>
              ) : (
                <span className="text-gray-500">
                  {tp.deadlineLabel}{' '}
                  <span className="font-semibold text-green-700 tabular-nums">{countdown}</span>
                </span>
              )}
            </div>
          )}
        </div>
        {/* Edit button — hidden when viewing another player */}
        {matches.length > 0 && !closed && !isViewingOther && (
          isEditing ? (
            <button
              onClick={() => { setIsEditing(false); setSaveMsg(null); setError(null); setInvalidIds(new Set()) }}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
            >
              {tp.cancel}
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-full border border-green-300 px-4 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
            >
              {tp.edit}
            </button>
          )
        )}
      </div>

      {/* Round selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {rounds.map((r) => (
          <button
            key={r.id}
            onClick={() => setRound(r)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedRound?.id === r.id
                ? 'bg-green-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700'
            }`}
          >
            {lang === 'es' ? r.name_es : r.name}
          </button>
        ))}
      </div>

      {/* Player viewer dropdown — only after deadline */}
      {closed && members.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 shrink-0">{tp.viewingPlayer}:</span>
          <select
            value={viewingUserId ?? ''}
            onChange={(e) => {
              const uid = e.target.value
              if (!uid) {
                setViewingUserId(null)
                setViewingName(null)
                if (selectedRound) loadMatches(selectedRound)
              } else {
                const member = members.find((m) => m.userId === uid)
                setViewingUserId(uid)
                setViewingName(member?.fullName ?? null)
                if (selectedRound) loadMatches(selectedRound, uid)
              }
            }}
            className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none bg-white"
          >
            <option value="">{tp.myPredictions}</option>
            {members.filter((m) => m.userId !== userId).map((m) => (
              <option key={m.userId} value={m.userId}>{m.fullName}</option>
            ))}
          </select>
        </div>
      )}

      {/* Viewing banner */}
      {isViewingOther && viewingName && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 flex items-center justify-between">
          <span>👁 {tp.viewingPlayer}: <strong>{viewingName}</strong></span>
          <button
            onClick={() => {
              setViewingUserId(null)
              setViewingName(null)
              if (selectedRound) loadMatches(selectedRound)
            }}
            className="text-blue-600 underline text-xs ml-3 shrink-0"
          >
            {tp.myPredictions}
          </button>
        </div>
      )}

      {/* Round summary bar */}
      {!loadingMatches && matches.length > 0 && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-semibold text-green-800">
            {tp.roundPoints}: <span className="tabular-nums">{roundPoints} {tp.pts}</span>
          </span>
          <span className="text-sm text-green-700">
            <span className="tabular-nums font-semibold">{finishedMatches.length}</span>
            <span className="text-green-600">/{matches.length}</span>
            {' '}{tp.matchesFinished}
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {saveMsg && !isEditing && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 text-center font-medium">
          {saveMsg}
        </div>
      )}

      {/* Matches */}
      {loadingMatches ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-400">{tp.noMatches}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byGroup).map(([group, gMatches]) => (
            <div key={group}>
              {isGroupStage && (
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {tp.group} {group}
                </h3>
              )}
              <div className="space-y-3">
                {gMatches.map((match) => {
                  const pred    = predictions[match.id] ?? { home: '', away: '' }
                  const locked  = closed || match.status !== 'scheduled'
                  const invalid = invalidMatchIds.has(match.id)
                  const hasResult = match.home_score !== null
                  const hasPred   = pred.home !== '' && pred.away !== ''

                  const breakdown = hasResult && hasPred
                    ? calcBreakdown(
                        parseInt(pred.home, 10), parseInt(pred.away, 10),
                        match.home_score!, match.away_score!, mul
                      )
                    : null

                  return (
                    <div
                      key={match.id}
                      className={`rounded-xl border bg-white transition-colors ${
                        invalid   ? 'border-red-400 shadow-sm' :
                        hasResult ? 'border-gray-200 shadow-sm' :
                        locked    ? 'border-gray-100 opacity-80' :
                                    'border-gray-100 shadow-sm'
                      }`}
                    >
                      {/* Top row: date + status */}
                      <div className="flex items-center justify-between px-4 pt-3 pb-2">
                        <p className="text-xs text-gray-400">{fmtDate(match.match_date)}</p>
                        <div className="flex items-center gap-2">
                          <StatusBadge match={match} tp={tp} />
                          {!hasResult && locked && <span className="text-xs text-gray-400">🔒</span>}
                          {invalid && <span className="text-xs text-red-500">⚠</span>}
                        </div>
                      </div>

                      {/* Teams + score inputs */}
                      <div className="flex items-center gap-3 px-4 pb-3">
                        <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {getTeamName(match.home_team, lang)}
                          </span>
                          <FlagImage countryCode={getTeamFlagCode(match.home_team)} />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isEditing && !locked && !isViewingOther ? (
                            <>
                              <input
                                type="number" min={0} max={15}
                                value={pred.home}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  const clamped = raw === '' ? '' : String(Math.max(0, parseInt(raw, 10) || 0))
                                  setPredictions((p) => ({ ...p, [match.id]: { ...pred, home: clamped } }))
                                  if (clamped !== '') setInvalidIds((s) => { const n = new Set(s); n.delete(match.id); return n })
                                }}
                                className={`w-12 rounded-lg border px-1 py-1.5 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
                                  invalid ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-green-500'
                                }`}
                              />
                              <span className="text-gray-400 font-bold text-sm">–</span>
                              <input
                                type="number" min={0} max={15}
                                value={pred.away}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  const clamped = raw === '' ? '' : String(Math.max(0, parseInt(raw, 10) || 0))
                                  setPredictions((p) => ({ ...p, [match.id]: { ...pred, away: clamped } }))
                                  if (clamped !== '') setInvalidIds((s) => { const n = new Set(s); n.delete(match.id); return n })
                                }}
                                className={`w-12 rounded-lg border px-1 py-1.5 text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
                                  invalid ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-green-500'
                                }`}
                              />
                            </>
                          ) : (
                            <>
                              <span className="w-12 text-center font-mono text-sm text-gray-700 bg-gray-50 rounded-lg py-1.5">
                                {pred.home !== '' ? pred.home : '–'}
                              </span>
                              <span className="text-gray-400 font-bold text-sm">–</span>
                              <span className="w-12 text-center font-mono text-sm text-gray-700 bg-gray-50 rounded-lg py-1.5">
                                {pred.away !== '' ? pred.away : '–'}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex-1 flex items-center gap-1.5 min-w-0">
                          <FlagImage countryCode={getTeamFlagCode(match.away_team)} />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {getTeamName(match.away_team, lang)}
                          </span>
                        </div>
                      </div>

                      {/* Result + prediction + breakdown (only when finished) */}
                      {hasResult && (
                        <div className="border-t border-gray-100 px-4 py-3 space-y-2">

                          {/* Official result */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 font-medium">{tp.officialResult}</span>
                            <span className="font-mono font-bold text-green-700 text-sm">
                              {match.home_score} – {match.away_score}
                            </span>
                          </div>

                          {/* Prediction row */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">
                              {isViewingOther && viewingName ? `${viewingName}:` : tp.yourPrediction}
                            </span>
                            {hasPred ? (
                              <span className="font-mono text-gray-700 font-medium">
                                {pred.home} – {pred.away}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">{tp.noPrediction}</span>
                            )}
                          </div>

                          {/* Points breakdown */}
                          {breakdown && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                {[
                                  { ok: breakdown.result, label: tp.correctResult, pts: breakdown.resultPts },
                                  { ok: breakdown.homeG,  label: tp.correctHome,   pts: breakdown.homePts   },
                                  { ok: breakdown.awayG,  label: tp.correctAway,   pts: breakdown.awayPts   },
                                  { ok: breakdown.diff,   label: tp.correctDiff,   pts: breakdown.diffPts   },
                                ].map(({ ok, label, pts }) => (
                                  <div
                                    key={label}
                                    className={`flex items-center justify-between text-xs ${ok ? 'text-green-700' : 'text-gray-400'}`}
                                  >
                                    <span className="flex items-center gap-1">
                                      <span className="font-bold">{ok ? '✓' : '✗'}</span>
                                      {label}
                                    </span>
                                    <span className="font-semibold tabular-nums ml-2">
                                      {ok ? `+${pts}` : '0'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100">
                                <span className="text-xs font-semibold text-gray-700">
                                  {tp.pointsEarned}
                                  {mul > 1 && (
                                    <span className="ml-1 text-green-600 font-normal">(×{mul})</span>
                                  )}
                                </span>
                                <span className={`text-sm font-bold tabular-nums ${breakdown.total > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                  {breakdown.total} {tp.pts}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save button — only in edit mode and own predictions */}
      {isEditing && matches.length > 0 && !isViewingOther && (
        <div className="sticky bottom-4">
          <button
            onClick={handleSave}
            disabled={saving || closed}
            className="w-full rounded-full bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors shadow-lg"
          >
            {saving ? tp.saving : closed ? tp.closed : tp.save}
          </button>
        </div>
      )}
    </div>
  )
}
