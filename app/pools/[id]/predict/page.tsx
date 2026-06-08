'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'
import PoolTabs from '@/components/PoolTabs'
import { getTeamName, getTeamFlagCode } from '@/lib/wc2026-teams'
import FlagImage from '@/components/FlagImage'
import { formatMatchTime, formatDeadlineShort } from '@/lib/date-utils'

interface Round {
  id: number
  name: string
  name_es: string
  prediction_deadline: string | null
  scoring_multiplier: number
  order_index: number
}

interface Match {
  id: string
  group_name: string | null
  home_team: string
  away_team: string
  match_date: string
  match_time: string | null
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
    // Reset every time the deadline changes (e.g. switching rounds).
    // Without this, closed stays true when navigating from a past-deadline
    // round to an open one because setClosed(true) is the only write inside tick.
    setClosed(false)
    setLabel('')
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

function isTeamTBD(team: string): boolean {
  return /^(W Match|L Match|W Group|RU Group|Best 3rd)/.test(team)
}

// Pick the right default round:
// 1. URL param match → that round
// 2. First round whose deadline is still in the future → active round
// 3. All deadlines passed → last round
// 4. Fallback → first round
function pickDefaultRound(rds: Round[], targetOrderIndex: number | null): Round | null {
  if (rds.length === 0) return null
  if (targetOrderIndex !== null) {
    const found = rds.find(r => r.order_index === targetOrderIndex)
    if (found) return found
  }
  const now = new Date()
  const active = rds.find(r => r.prediction_deadline && new Date(r.prediction_deadline) > now)
  return active ?? rds[rds.length - 1]
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
  const [originalPredictions, setOriginalPredictions] = useState<Record<string, Prediction>>({})
  const [isEditing, setIsEditing]     = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [missingCount, setMissingCount] = useState(0)
  const [loading, setLoading]         = useState(true)
  const [loadingMatches, setLM]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saveMsg, setSaveMsg]         = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [exporting, setExporting]     = useState(false)
  const [userId, setUserId]           = useState<string | null>(null)

  // Viewer state
  const [members, setMembers]             = useState<Member[]>([])
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [viewingName, setViewingName]     = useState<string | null>(null)
  const [playerSearch, setPlayerSearch]   = useState('')
  const [playerFocused, setPlayerFocused] = useState(false)
  const playerInputRef    = useRef<HTMLInputElement>(null)
  const selectedRoundRef  = useRef<HTMLButtonElement>(null)
  const roundSelectorRef  = useRef<HTMLDivElement>(null)

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
        .select('id, name, name_es, prediction_deadline, scoring_multiplier, order_index')
        .order('order_index', { ascending: true })

      const roundParam = new URLSearchParams(window.location.search).get('round')
      const targetIdx  = roundParam ? parseInt(roundParam, 10) : null
      setRounds(rds ?? [])
      setRound(pickDefaultRound(rds ?? [], targetIdx))
      setLoading(false)
    }
    init()
  }, [poolId, router])

  // ── Load member list as soon as the user is known ────────────────────────
  // (display is still gated on `closed` — members load eagerly so the
  //  dropdown is ready the moment the deadline passes without a refresh)
  useEffect(() => {
    if (!userId || !poolId) return
    fetch(`/api/pools/${poolId}/members/list`)
      .then((r) => r.ok ? r.json() : { members: [] })
      .then((d) => setMembers(d.members ?? []))
  }, [userId, poolId])

  // ── Load matches + predictions for the selected round ────────────────────
  const loadMatches = useCallback(async (round: Round, forUserId?: string) => {
    if (!userId) return
    setLM(true)
    setIsEditing(false)
    setConfirmOpen(false)

    // Reset viewing when changing rounds without a specific viewer
    if (!forUserId) {
      setViewingUserId(null)
      setViewingName(null)
    }

    const supabase = createClient()
    const { data: matchData } = await supabase
      .from('matches')
      .select('id, group_name, home_team, away_team, match_date, match_time, venue, home_score, away_score, status')
      .eq('round_id', round.id)
      .order('match_date', { ascending: true })

    const matchIds = (matchData ?? []).map((m) => m.id)
    console.log('[loadMatches] round', round.id, '→', matchData?.length ?? 0, 'matches, ids:', matchIds)

    const targetId = forUserId ?? userId
    const predMap: Record<string, Prediction> = {}

    if (matchIds.length > 0) {
      if (targetId === userId) {
        const { data: predData, error: predErr } = await supabase
          .from('predictions')
          .select('match_id, predicted_home_score, predicted_away_score')
          .eq('pool_id', poolId)
          .eq('user_id', userId)
          .in('match_id', matchIds)

        console.log('[loadMatches] own preds:', predData?.length ?? 0, 'err:', predErr?.message)
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
        console.log('[loadMatches] other preds API status:', res.status)
        if (res.ok) {
          const data = await res.json()
          console.log('[loadMatches] other preds count:', data.predictions?.length ?? 0)
          for (const p of data.predictions ?? []) {
            predMap[p.match_id] = {
              home: p.predicted_home_score?.toString() ?? '',
              away: p.predicted_away_score?.toString() ?? '',
            }
          }
        }
      }
    }

    console.log('[loadMatches] predMap keys:', Object.keys(predMap).length)
    setMatches((matchData ?? []) as Match[])
    setPredictions(predMap)
    setLM(false)
  }, [poolId, userId])

  useEffect(() => {
    if (selectedRound && userId) loadMatches(selectedRound)
  }, [selectedRound, userId, loadMatches])

  useEffect(() => {
    if (selectedRoundRef.current) {
      selectedRoundRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [selectedRound])

  // Updates state and URL bar without a navigation (no history entry added)
  function selectRound(r: Round) {
    setRound(r)
    const url = new URL(window.location.href)
    url.searchParams.set('round', String(r.order_index))
    window.history.replaceState(null, '', url.toString())
  }

  // ── Save predictions ──────────────────────────────────────────────────────
  async function handleSave(skipConfirm = false) {
    if (!userId || !selectedRound || closed) return

    const scheduled = matches.filter((m) => m.status === 'scheduled')

    // Only save rows where BOTH home and away are filled
    const filledRows = scheduled
      .filter((m) => {
        const p = predictions[m.id] ?? { home: '', away: '' }
        return p.home !== '' && p.away !== ''
      })
      .map((m) => {
        const p = predictions[m.id]!
        return {
          user_id:              userId,
          pool_id:              poolId,
          match_id:             m.id,
          predicted_home_score: Number(p.home),
          predicted_away_score: Number(p.away),
        }
      })

    const unpredicted = scheduled.length - filledRows.length

    // If some matches are unfilled, ask for confirmation first
    if (!skipConfirm && unpredicted > 0) {
      setMissingCount(unpredicted)
      setConfirmOpen(true)
      return
    }

    if (filledRows.length === 0) return

    setSaving(true); setError(null); setSaveMsg(null)

    const res = await fetch(`/api/pools/${poolId}/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: filledRows, round_id: selectedRound.id }),
    })
    const upsertError = res.ok ? null : await res.json().then((d: { error?: string }) => ({ message: d.error ?? 'Save failed' }))

    setSaving(false)
    if (upsertError) {
      setError(upsertError.message)
    } else {
      setIsEditing(false)
      setConfirmOpen(false)

      const currentIdx = rounds.findIndex(r => r.id === selectedRound!.id)
      const nextRound  = currentIdx >= 0 && currentIdx < rounds.length - 1
        ? rounds[currentIdx + 1]
        : null

      if (unpredicted === 0 && scheduled.length > 0 && nextRound) {
        // All scheduled matches filled — advance to next round
        setSaveMsg(tp.allSavedAdvancing)
        setTimeout(() => {
          setSaveMsg(null)
          selectRound(nextRound)
        }, 1500)
      } else {
        setSaveMsg(tp.savedCount.replace('{n}', String(filledRows.length)))
        setTimeout(() => setSaveMsg(null), 3000)
      }
    }
  }

  // ── Export to Excel ───────────────────────────────────────────────────────
  async function handleExport() {
    if (!selectedRound || !closed) return
    setExporting(true)
    try {
      const res = await fetch(`/api/pools/${poolId}/export?round_id=${selectedRound.id}`)
      if (!res.ok) return

      const data = await res.json() as {
        poolName: string
        isAdmin: boolean
        round: { name: string; name_es: string; scoring_multiplier: number }
        members: {
          userId: string; fullName: string; email: string
          totalPoints: number; bonusPoints: number
          pointsMd1: number; pointsMd2: number; pointsMd3: number
          pointsR32: number; pointsR16: number; pointsQf: number
          pointsSf: number; pointsFinal: number
        }[]
        matches: Match[]
        predictions: {
          user_id: string; match_id: string
          predicted_home_score: number; predicted_away_score: number
          points_earned: number | null
        }[]
      }

      const XLSX = await import('xlsx')
      const { members: mems, matches: allMatches, predictions: preds, round: rnd, poolName, isAdmin } = data
      const mul2 = rnd.scoring_multiplier
      const pending = tp.exportPending

      // pred lookup: userId → matchId → { home, away, pts }
      const predMap: Record<string, Record<string, { home: number; away: number; pts: number | null }>> = {}
      for (const p of preds) {
        if (!predMap[p.user_id]) predMap[p.user_id] = {}
        predMap[p.user_id][p.match_id] = {
          home: p.predicted_home_score,
          away: p.predicted_away_score,
          pts:  p.points_earned,
        }
      }

      // Sort matches: group then date/time
      const sortedMatches = [...allMatches].sort((a, b) => {
        const ga = a.group_name ?? 'ZZZ'
        const gb = b.group_name ?? 'ZZZ'
        if (ga !== gb) return ga < gb ? -1 : 1
        return (a.match_date + (a.match_time ?? '')) < (b.match_date + (b.match_time ?? '')) ? -1 : 1
      })

      // Members sorted alphabetically for secondary sort
      const sortedMems = [...mems].sort((a, b) => a.fullName.localeCompare(b.fullName))

      // ── Sheet 1: Predictions (tall format) ─────────────────────
      const predHeaders = [
        ...(isAdmin ? ['Email'] : []),
        'Player Name', 'Match #', 'Date', 'Group',
        'Home Team', 'Away Team',
        'Home Pred', 'Away Pred',
        'Home Score', 'Away Score', 'Points',
      ]

      const predRows: (string | number)[][] = [predHeaders]

      for (let i = 0; i < sortedMatches.length; i++) {
        const match = sortedMatches[i]
        const hasResult = match.home_score !== null
        const dateStr = formatMatchTime(match.match_date, match.match_time ?? '00:00:00', lang)
        const homeTeam = getTeamName(match.home_team, lang)
        const awayTeam = getTeamName(match.away_team, lang)

        for (const mem of sortedMems) {
          const p = predMap[mem.userId]?.[match.id]

          let pts: string | number
          if (!hasResult) {
            pts = pending
          } else if (!p) {
            pts = 0
          } else {
            // Always calculate on the fly so the export is correct even if
            // calculate-scores was never run (points_earned defaults to 0 in DB).
            pts = calcBreakdown(p.home, p.away, match.home_score!, match.away_score!, mul2).total
          }

          predRows.push([
            ...(isAdmin ? [mem.email] : []),
            mem.fullName,
            i + 1,
            dateStr,
            match.group_name ?? '—',
            homeTeam,
            awayTeam,
            p ? p.home : '',
            p ? p.away : '',
            hasResult ? match.home_score! : pending,
            hasResult ? match.away_score! : pending,
            pts,
          ])
        }
      }

      const ws1 = XLSX.utils.aoa_to_sheet(predRows)

      // Auto-fit column widths for sheet 1
      ws1['!cols'] = predHeaders.map((h, ci) => {
        const maxLen = predRows.reduce((mx, row) => Math.max(mx, String(row[ci] ?? '').length), 0)
        return { wch: Math.max(maxLen, h.length) + 2 }
      })

      // ── Sheet 2: Summary (leaderboard-style) ───────────────────
      const summaryHeaders = [
        'Rank',
        'Player Name',
        ...(isAdmin ? ['Email'] : []),
        'Total Points', 'Bonus',
        'MD1', 'MD2', 'MD3', 'R32', 'R16', 'QF', 'SF', 'Final',
      ]

      // mems already sorted by totalPoints desc from the API; assign ranks with tie handling
      let currentRank = 1
      const rankedMems = mems.map((m, i) => {
        if (i > 0 && m.totalPoints < mems[i - 1].totalPoints) currentRank = i + 1
        return { ...m, rank: currentRank }
      })

      const summaryRows: (string | number)[][] = [
        summaryHeaders,
        ...rankedMems.map((m) => [
          m.rank,
          m.fullName,
          ...(isAdmin ? [m.email] : []),
          m.totalPoints,
          m.bonusPoints,
          m.pointsMd1, m.pointsMd2, m.pointsMd3,
          m.pointsR32, m.pointsR16, m.pointsQf, m.pointsSf, m.pointsFinal,
        ]),
      ]

      const ws2 = XLSX.utils.aoa_to_sheet(summaryRows)

      ws2['!cols'] = summaryHeaders.map((h, ci) => {
        const maxLen = summaryRows.reduce((mx, row) => Math.max(mx, String(row[ci] ?? '').length), 0)
        return { wch: Math.max(maxLen, h.length) + 2 }
      })

      // ── Assemble workbook ────────────────────────────────────────
      const wb = XLSX.utils.book_new()
      const rawName = lang === 'es' ? rnd.name_es : rnd.name
      const safeSheet = rawName.replace(/[\\/?*[\]:]/g, '_').substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws1, safeSheet)
      XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

      const filename = `${poolName} - ${rawName} - Predictions.xlsx`
      XLSX.writeFile(wb, filename)
    } finally {
      setExporting(false)
    }
  }

  const mul = selectedRound?.scoring_multiplier ?? 1
  const isGroupStage = selectedRound ? selectedRound.id <= 3 : true
  const isViewingOther = !!viewingUserId

  // Clear search state whenever viewing resets to self
  useEffect(() => {
    if (!viewingUserId) { setPlayerSearch(''); setPlayerFocused(false) }
  }, [viewingUserId])

  // Show all non-self members when focused; filter when the user types
  const playerResults = (playerFocused || playerSearch.trim())
    ? members.filter(
        (m) =>
          m.userId !== userId &&
          (!playerSearch.trim() ||
            m.fullName.toLowerCase().includes(playerSearch.toLowerCase().trim()))
      )
    : []

  const cancelChangedCount = matches.filter((m) => {
    const cur = predictions[m.id] ?? { home: '', away: '' }
    const orig = originalPredictions[m.id] ?? { home: '', away: '' }
    return cur.home !== orig.home || cur.away !== orig.away
  }).length

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
        <div className="mt-4">
          <PoolTabs poolId={poolId} activeTab="predict" />
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
                  {' '}
                  <span className="text-xs text-gray-400">
                    {tp.deadlineAt} {formatDeadlineShort(selectedRound.prediction_deadline, lang)}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
        {/* Export button — after deadline, not editing */}
        {matches.length > 0 && closed && !isEditing && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors disabled:opacity-60"
          >
            {exporting ? '…' : tp.exportBtn}
          </button>
        )}
        {/* Edit button — hidden when viewing another player */}
        {matches.length > 0 && !closed && !isViewingOther && (
          isEditing ? (
            <button
              onClick={() => {
                if (cancelChangedCount > 0) {
                  setCancelConfirmOpen(true)
                } else {
                  setIsEditing(false); setSaveMsg(null); setError(null); setConfirmOpen(false)
                }
              }}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
            >
              {tp.cancel}
            </button>
          ) : (
            <button
              onClick={() => { setOriginalPredictions({ ...predictions }); setIsEditing(true) }}
              className="rounded-full border border-green-300 px-4 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
            >
              {tp.edit}
            </button>
          )
        )}
      </div>

      {/* Round selector */}
      <div ref={roundSelectorRef} className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {rounds.map((r) => (
          <button
            key={r.id}
            ref={r.id === selectedRound?.id ? selectedRoundRef : null}
            onClick={() => selectRound(r)}
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

      {/* Player search — only after deadline */}
      {closed && members.length > 1 && (
        <div className="relative">
          <p className="text-xs font-medium text-gray-500 mb-1.5">👁 {tp.viewingPlayer}:</p>
          <input
            ref={playerInputRef}
            type="text"
            value={playerSearch}
            onFocus={() => setPlayerFocused(true)}
            onBlur={() => { setPlayerFocused(false) }}
            onChange={(e) => setPlayerSearch(e.target.value)}
            placeholder={tp.searchPlayer}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
          {playerResults.length > 0 && (
            <ul className="absolute z-50 top-full mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl max-h-52 overflow-y-auto py-1">
              {playerResults.map((m) => (
                <li
                  key={m.userId}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setPlayerFocused(false)
                    setPlayerSearch('')
                    playerInputRef.current?.blur()
                    setViewingUserId(m.userId)
                    setViewingName(m.fullName)
                    if (selectedRound) loadMatches(selectedRound, m.userId)
                  }}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 cursor-pointer"
                >
                  {m.fullName}
                </li>
              ))}
            </ul>
          )}
          {playerFocused && playerSearch.trim() && playerResults.length === 0 && (
            <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl px-3 py-2 text-sm text-gray-400">
              {tp.selectPlayer}
            </div>
          )}
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
                  const pred      = predictions[match.id] ?? { home: '', away: '' }
                  const isTBD     = isTeamTBD(match.home_team) || isTeamTBD(match.away_team)
                  const locked    = closed || match.status !== 'scheduled'
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
                        hasResult ? 'border-gray-200 shadow-sm' :
                        locked    ? 'border-gray-100 opacity-80' :
                                    'border-gray-100 shadow-sm'
                      }`}
                    >
                      {/* Top row: date + status */}
                      <div className="flex items-center justify-between px-4 pt-3 pb-2">
                        <p className="text-xs text-gray-400">{formatMatchTime(match.match_date, match.match_time ?? '00:00:00', lang)}</p>
                        <div className="flex items-center gap-2">
                          {/* "Not predicted" badge — view mode, open round, no existing prediction */}
                          {!isEditing && !locked && !isTBD && !hasPred && !isViewingOther && (
                            <span className="text-xs font-medium text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                              {tp.notPredicted}
                            </span>
                          )}
                          {isTBD && (
                            <span className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                              Teams TBD
                            </span>
                          )}
                          <StatusBadge match={match} tp={tp} />
                          {!hasResult && locked && !isTBD && <span className="text-xs text-gray-400">🔒</span>}
                        </div>
                      </div>

                      {/* Teams + score inputs */}
                      <div className="flex items-center gap-3 px-4 pb-3">
                        <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                          {isTBD ? (
                            <span className="text-sm font-medium text-gray-400 truncate italic">
                              {match.home_team}
                            </span>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {getTeamName(match.home_team, lang)}
                              </span>
                              <FlagImage countryCode={getTeamFlagCode(match.home_team)} />
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isEditing && !locked && !isTBD && !isViewingOther ? (
                            <>
                              <input
                                type="number" min={0} max={15}
                                value={pred.home}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  const clamped = raw === '' ? '' : String(Math.max(0, parseInt(raw, 10) || 0))
                                  setPredictions((p) => ({ ...p, [match.id]: { ...pred, home: clamped } }))
                                }}
                                className="w-12 rounded-lg border border-gray-300 px-1 py-1.5 text-sm text-center font-mono focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                              />
                              <span className="text-gray-400 font-bold text-sm">–</span>
                              <input
                                type="number" min={0} max={15}
                                value={pred.away}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  const clamped = raw === '' ? '' : String(Math.max(0, parseInt(raw, 10) || 0))
                                  setPredictions((p) => ({ ...p, [match.id]: { ...pred, away: clamped } }))
                                }}
                                className="w-12 rounded-lg border border-gray-300 px-1 py-1.5 text-sm text-center font-mono focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
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
                          {isTBD ? (
                            <span className="text-sm font-medium text-gray-400 truncate italic">
                              {match.away_team}
                            </span>
                          ) : (
                            <>
                              <FlagImage countryCode={getTeamFlagCode(match.away_team)} />
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {getTeamName(match.away_team, lang)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* TBD message */}
                      {isTBD && !hasResult && (
                        <div className="px-4 pb-3">
                          <p className="text-xs text-gray-400 italic text-center">{tp.tbdMessage}</p>
                        </div>
                      )}

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

      {/* Confirmation dialog — cancel with unsaved changes */}
      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {tp.cancelConfirmMsg.replace('{n}', String(cancelChangedCount))}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPredictions({ ...originalPredictions })
                  setCancelConfirmOpen(false)
                  setIsEditing(false)
                  setSaveMsg(null)
                  setError(null)
                  setConfirmOpen(false)
                }}
                className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
              >
                {tp.yesDiscard}
              </button>
              <button
                onClick={() => setCancelConfirmOpen(false)}
                className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
              >
                {tp.keepEditing}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation dialog — incomplete predictions */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {tp.missingMatches.replace('{n}', String(missingCount))}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex-1 rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {saving ? tp.saving : tp.saveAnyway}
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
                className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
              >
                {tp.goBack}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save button — only in edit mode and own predictions */}
      {isEditing && matches.length > 0 && !isViewingOther && (
        <div className="sticky bottom-4">
          <button
            onClick={() => handleSave()}
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
