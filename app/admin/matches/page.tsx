'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMatchTime } from '@/lib/date-utils'
import SearchableSelect from '@/components/SearchableSelect'
import { getTeamOptions, getTeamFlagCodesMap } from '@/lib/wc2026-teams'
import { WC2026_PLAYERS } from '@/lib/wc2026-players'

interface Round {
  id: number
  name: string
}

interface Match {
  id: string
  match_number: number | null
  group_name: string | null
  home_team: string
  away_team: string
  match_date: string
  match_time: string | null
  venue: string
  home_score: number | null
  away_score: number | null
  status: 'scheduled' | 'live' | 'finished' | 'cancelled'
  rounds: { id: number; name: string }
}

interface ScoreState { home: string; away: string; status: string }

interface SyncResult {
  updated: number
  finished: number
  errors: string[]
}

interface AuditEntry {
  id: string
  user_id: string
  pool_id: string | null
  action: string
  table_name: string
  payload: {
    round_id?: number
    match_count?: number
    changes?: Array<unknown>
  } | null
  old_data: unknown
  new_data: unknown
  ip_address: string | null
  created_at: string
  pool_name:  string | null
  user_name:  string | null
  user_email: string | null
}

const STATUS_OPTIONS = ['scheduled', 'live', 'finished', 'cancelled']

const BONUS_OFFICIAL_FIELDS = [
  { key: 'winner',       label: 'Tournament Winner', type: 'team'       },
  { key: 'runner_up',    label: 'Runner-up',         type: 'team'       },
  { key: 'third_place',  label: 'Third Place',       type: 'team'       },
  { key: 'golden_ball',  label: 'Golden Ball',       type: 'player'     },
  { key: 'golden_boot',  label: 'Golden Boot',       type: 'player'     },
  { key: 'golden_glove', label: 'Golden Glove',      type: 'goalkeeper' },
] as const

const KNOCKOUT_BRACKET: Record<number, { home: string; away: string }> = {
  // Round of 32
   73: { home: 'RU Group A', away: 'RU Group B' },
   74: { home: 'W Group E',  away: 'Best 3rd A/B/C/D/F' },
   75: { home: 'W Group F',  away: 'RU Group C' },
   76: { home: 'W Group C',  away: 'RU Group F' },
   77: { home: 'W Group I',  away: 'Best 3rd C/D/F/G/H' },
   78: { home: 'RU Group E', away: 'RU Group I' },
   79: { home: 'W Group A',  away: 'Best 3rd C/E/F/H/I' },
   80: { home: 'W Group L',  away: 'Best 3rd E/H/I/J/K' },
   81: { home: 'W Group D',  away: 'Best 3rd B/E/F/I/J' },
   82: { home: 'W Group G',  away: 'Best 3rd A/E/H/I/J' },
   83: { home: 'RU Group K', away: 'RU Group L' },
   84: { home: 'W Group H',  away: 'RU Group J' },
   85: { home: 'W Group B',  away: 'Best 3rd E/F/G/I/J' },
   86: { home: 'W Group J',  away: 'RU Group H' },
   87: { home: 'W Group K',  away: 'Best 3rd D/E/I/J/L' },
   88: { home: 'RU Group D', away: 'RU Group G' },
  // Round of 16
   89: { home: 'W Match 74', away: 'W Match 75' },
   90: { home: 'W Match 73', away: 'W Match 76' },
   91: { home: 'W Match 77', away: 'W Match 80' },
   92: { home: 'W Match 78', away: 'W Match 79' },
   93: { home: 'W Match 81', away: 'W Match 84' },
   94: { home: 'W Match 82', away: 'W Match 83' },
   95: { home: 'W Match 85', away: 'W Match 88' },
   96: { home: 'W Match 86', away: 'W Match 87' },
  // Quarterfinals
   97: { home: 'W Match 89', away: 'W Match 90' },
   98: { home: 'W Match 93', away: 'W Match 94' },
   99: { home: 'W Match 91', away: 'W Match 92' },
  100: { home: 'W Match 95', away: 'W Match 96' },
  // Semifinals
  101: { home: 'W Match 97', away: 'W Match 98' },
  102: { home: 'W Match 99', away: 'W Match 100' },
  // Third place & Final
  103: { home: 'L Match 101', away: 'L Match 102' },
  104: { home: 'W Match 101', away: 'W Match 102' },
}

function getBracketEntry(match: Match): { home: string; away: string } | null {
  if (match.match_number == null) return null
  return KNOCKOUT_BRACKET[match.match_number] ?? null
}

export default function AdminMatchesPage() {
  const router = useRouter()

  const [adminStatus, setAdminStatus]   = useState<'checking' | 'granted' | 'denied'>('checking')
  const [rounds, setRounds]             = useState<Round[]>([])
  const [matches, setMatches]           = useState<Match[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [scores, setScores]             = useState<Record<string, ScoreState>>({})
  const [saving, setSaving]             = useState<Record<string, boolean>>({})
  const [saved, setSaved]               = useState<Record<string, boolean>>({})
  const [calculating, setCalc]          = useState<Record<string, boolean>>({})
  const [calcMsg, setCalcMsg]           = useState<Record<string, string>>({})

  // Round filter
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null)

  // Sync
  const [syncing, setSyncing]           = useState(false)
  const [syncResult, setSyncResult]     = useState<SyncResult | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // Calculate all scores
  const [calcAllProgress, setCalcAllProgress] = useState<{ current: number; total: number } | null>(null)
  const [calcAllDone, setCalcAllDone]   = useState<string | null>(null)

  // Clear all results
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearing, setClearing]         = useState(false)

  // Clear round results
  const [clearRoundConfirm, setClearRoundConfirm] = useState<number | null>(null)
  const [clearingRoundId, setClearingRoundId]     = useState<number | null>(null)

  // Knockout team edits: matchId → { home, away }
  const [teamEdits, setTeamEdits]   = useState<Record<string, { home: string; away: string }>>({})
  const [savingTeams, setSavingTeams] = useState<Record<string, boolean>>({})
  const [teamSaved, setTeamSaved]   = useState<Record<string, boolean>>({})
  const [resetConfirmMatchId, setResetConfirmMatchId] = useState<string | null>(null)

  // Bonus results panel
  const [showBonus, setShowBonus]             = useState(false)
  const [bonusResults, setBonusResults]       = useState<Record<string, string>>({})
  const [bonusLoading, setBonusLoading]       = useState(false)
  const [bonusSaving, setBonusSaving]         = useState(false)
  const [bonusSaved, setBonusSaved]           = useState(false)
  const [bonusError, setBonusError]           = useState<string | null>(null)
  const [bonusClearConfirm, setBonusClearConfirm] = useState(false)
  const [bonusClearing, setBonusClearing]     = useState(false)
  const [bonusClearSaved, setBonusClearSaved] = useState(false)

  // Audit log
  const [auditLogs, setAuditLogs]       = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError]     = useState<string | null>(null)

  // ── Verify admin ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/is-admin')
      .then((r) => r.json())
      .then((d) => {
        if (d.isAdmin) {
          setAdminStatus('granted')
        } else {
          setAdminStatus('denied')
          setTimeout(() => router.push('/dashboard'), 2000)
        }
      })
      .catch(() => {
        setAdminStatus('denied')
        setTimeout(() => router.push('/dashboard'), 2000)
      })
  }, [router])

  // ── Load rounds + matches once admin confirmed ────────────────────────────
  useEffect(() => {
    if (adminStatus !== 'granted') return

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: roundsData }, { data, error: matchErr }] = await Promise.all([
        supabase
          .from('rounds')
          .select('id, name')
          .order('order_index', { ascending: true }),
        supabase
          .from('matches')
          .select('id, match_number, group_name, home_team, away_team, match_date, match_time, venue, home_score, away_score, status, rounds(id, name)')
          .order('match_date', { ascending: true }),
      ])

      setRounds((roundsData ?? []) as Round[])

      if (matchErr) { setError(matchErr.message); setLoading(false); return }

      const m = (data ?? []) as unknown as Match[]
      setMatches(m)

      const init: Record<string, ScoreState> = {}
      m.forEach((match) => {
        init[match.id] = {
          home:   match.home_score?.toString() ?? '',
          away:   match.away_score?.toString() ?? '',
          status: match.status,
        }
      })
      setScores(init)
      setLoading(false)
    }

    async function loadAuditLog() {
      setAuditLoading(true)
      setAuditError(null)
      try {
        const res = await fetch('/api/admin/audit-log?limit=50')
        const data = await res.json()
        if (res.ok) setAuditLogs(data.logs ?? [])
        else setAuditError(data.error ?? 'Failed to load audit log')
      } catch (err) {
        setAuditError(String(err))
      } finally {
        setAuditLoading(false)
      }
    }

    load()
    loadAuditLog()
  }, [adminStatus, router])

  // ── Per-match actions ─────────────────────────────────────────────────────

  async function saveMatch(matchId: string) {
    setSaving((s) => ({ ...s, [matchId]: true }))
    const sc = scores[matchId]
    const body: Record<string, unknown> = { status: sc.status }
    if (sc.home !== '') body.home_score = Number(sc.home)
    if (sc.away !== '') body.away_score = Number(sc.away)
    if (sc.home === '' && sc.away === '') { body.home_score = null; body.away_score = null }

    const res = await fetch(`/api/admin/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving((s) => ({ ...s, [matchId]: false }))
    if (res.ok) {
      setSaved((s) => ({ ...s, [matchId]: true }))
      setTimeout(() => setSaved((s) => ({ ...s, [matchId]: false })), 2000)
      // Sync matches state so handleCalculateAll sees the new scores/status immediately
      setMatches((prev) => prev.map((m) => {
        if (m.id !== matchId) return m
        return {
          ...m,
          status:     sc.status as Match['status'],
          home_score: sc.home !== '' ? Number(sc.home) : null,
          away_score: sc.away !== '' ? Number(sc.away) : null,
        }
      }))
    } else {
      const d = await res.json()
      setError(d.error ?? 'Save failed')
    }
  }

  async function calculateScores(matchId: string) {
    setCalc((s) => ({ ...s, [matchId]: true }))
    const res = await fetch(`/api/matches/${matchId}/calculate-scores`, { method: 'POST' })
    const d = await res.json()
    setCalc((s) => ({ ...s, [matchId]: false }))
    setCalcMsg((s) => ({
      ...s,
      [matchId]: res.ok ? `✓ ${d.updated} updated` : `✗ ${d.error ?? 'Error'}`,
    }))
    setTimeout(() => setCalcMsg((s) => ({ ...s, [matchId]: '' })), 4000)
  }

  // ── Bonus results ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!showBonus) return
    setBonusLoading(true)
    fetch('/api/admin/bonus-results')
      .then((r) => r.ok ? r.json() : { results: null })
      .then((d) => { if (d.results) setBonusResults(d.results as Record<string, string>) })
      .catch(() => {})
      .finally(() => setBonusLoading(false))
  }, [showBonus])

  async function handleSaveBonusResults() {
    setBonusSaving(true)
    setBonusError(null)
    setBonusSaved(false)
    const res = await fetch('/api/admin/bonus-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bonusResults),
    })
    setBonusSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setBonusError(d.error ?? 'Save failed')
    } else {
      setBonusSaved(true)
      setTimeout(() => setBonusSaved(false), 5000)
    }
  }

  async function handleClearBonusResults() {
    setBonusClearing(true)
    setBonusError(null)
    const res = await fetch('/api/admin/bonus-results', { method: 'DELETE' })
    setBonusClearing(false)
    setBonusClearConfirm(false)
    if (!res.ok) {
      const d = await res.json()
      setBonusError(d.error ?? 'Clear failed')
    } else {
      setBonusResults({})
      setBonusClearSaved(true)
      setTimeout(() => setBonusClearSaved(false), 5000)
    }
  }

  // ── Knockout team update ─────────────────────────────────────────────────

  async function handleUpdateTeams(matchId: string) {
    const edit = teamEdits[matchId]
    if (!edit) return
    setSavingTeams((s) => ({ ...s, [matchId]: true }))

    const body: Record<string, string> = {}
    if (edit.home) body.home_team = edit.home
    if (edit.away) body.away_team = edit.away

    const res = await fetch(`/api/admin/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSavingTeams((s) => ({ ...s, [matchId]: false }))

    if (res.ok) {
      const updated = await res.json() as { home_team: string; away_team: string }
      setMatches((prev) => prev.map((m) =>
        m.id === matchId ? { ...m, home_team: updated.home_team, away_team: updated.away_team } : m
      ))
      setTeamEdits((prev) => { const n = { ...prev }; delete n[matchId]; return n })
      setTeamSaved((s) => ({ ...s, [matchId]: true }))
      setTimeout(() => setTeamSaved((s) => ({ ...s, [matchId]: false })), 2500)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Update teams failed')
    }
  }

  async function handleResetTBD(matchId: string) {
    const match = matches.find((m) => m.id === matchId)
    if (!match) return
    const bracket = getBracketEntry(match)
    if (!bracket) return

    setSavingTeams((s) => ({ ...s, [matchId]: true }))
    const res = await fetch(`/api/admin/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ home_team: bracket.home, away_team: bracket.away }),
    })
    setSavingTeams((s) => ({ ...s, [matchId]: false }))
    setResetConfirmMatchId(null)

    if (res.ok) {
      setMatches((prev) => prev.map((m) =>
        m.id === matchId ? { ...m, home_team: bracket.home, away_team: bracket.away } : m
      ))
      setTeamSaved((s) => ({ ...s, [matchId]: true }))
      setTimeout(() => setTeamSaved((s) => ({ ...s, [matchId]: false })), 2500)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Reset failed')
    }
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/cron/update-scores')
      const data = await res.json()
      if (res.ok) {
        setSyncResult(data)
        setLastSyncTime(new Date())
      } else {
        setError(data.error ?? 'Sync failed')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSyncing(false)
    }
  }

  async function handleCalculateAll() {
    // Log full state so we can see exactly what's in the array
    console.log('[calculateAll] total matches in state:', matches.length)
    const statusCounts = matches.reduce<Record<string, number>>((acc, m) => {
      acc[m.status] = (acc[m.status] ?? 0) + 1
      return acc
    }, {})
    console.log('[calculateAll] status breakdown:', statusCounts)
    console.log('[calculateAll] matches with scores set:', matches.filter(m => m.home_score !== null).length)

    // Filter by scores present — status label is secondary since admins may forget to set it
    const finishedMatches = matches.filter(
      (m) => m.home_score !== null && m.away_score !== null
    )
    console.log('[calculateAll] matches to calculate:', finishedMatches.length)

    if (finishedMatches.length === 0) {
      setCalcAllDone('No finished matches to calculate.')
      setTimeout(() => setCalcAllDone(null), 4000)
      return
    }

    setCalcAllProgress({ current: 0, total: finishedMatches.length })
    setCalcAllDone(null)
    setError(null)

    let succeeded = 0
    const errors: string[] = []

    for (let i = 0; i < finishedMatches.length; i++) {
      const match = finishedMatches[i]
      console.log(`[calculateAll] ${i + 1}/${finishedMatches.length} — match ${match.id} (${match.home_team} vs ${match.away_team})`)

      try {
        const res = await fetch(`/api/matches/${match.id}/calculate-scores`, { method: 'POST' })
        const d = await res.json()

        if (res.ok) {
          console.log(`[calculateAll] ✓ ${d.updated} predictions updated`)
          succeeded++
        } else {
          console.error(`[calculateAll] ✗ HTTP ${res.status}:`, d.error)
          errors.push(`${match.home_team} vs ${match.away_team}: ${d.error ?? `HTTP ${res.status}`}`)
        }
      } catch (err) {
        console.error(`[calculateAll] ✗ network error:`, err)
        errors.push(`${match.home_team} vs ${match.away_team}: network error`)
      }

      setCalcAllProgress({ current: i + 1, total: finishedMatches.length })
    }

    setCalcAllProgress(null)

    if (errors.length > 0) {
      setError(`${errors.length} match(es) failed to score:\n${errors.slice(0, 5).join('\n')}`)
    }

    setCalcAllDone(
      errors.length > 0
        ? `Done! ${succeeded}/${finishedMatches.length} scored (${errors.length} errors — see above)`
        : `Done! ${succeeded} match${succeeded !== 1 ? 'es' : ''} scored.`
    )
    setTimeout(() => setCalcAllDone(null), 8000)
  }

  async function handleClearAll() {
    setClearing(true)
    const res = await fetch('/api/admin/matches/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setClearing(false)
    setClearConfirmOpen(false)

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Clear failed')
      return
    }

    const data = await res.json()

    // Reset local UI state
    setMatches((prev) =>
      prev.map((m) => ({ ...m, home_score: null, away_score: null, status: 'scheduled' as const }))
    )
    setScores((prev) => {
      const next: Record<string, ScoreState> = {}
      Object.keys(prev).forEach((k) => { next[k] = { home: '', away: '', status: 'scheduled' } })
      return next
    })

    setCalcAllDone(
      `All cleared — ${data.predictionsReset ?? 0} predictions reset, ` +
      `${data.membersReset ?? 0} members reset, ${data.bonusReset ?? 0} bonus reset.`
    )
    setTimeout(() => setCalcAllDone(null), 8000)
  }

  async function handleClearRound(roundId: number) {
    setClearingRoundId(roundId)
    const res = await fetch('/api/admin/matches/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round_id: roundId }),
    })
    setClearingRoundId(null)
    setClearRoundConfirm(null)

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Clear round failed')
      return
    }

    const data = await res.json()

    // Reset local UI state for this round's matches
    setMatches((prev) =>
      prev.map((m) =>
        m.rounds?.id === roundId
          ? { ...m, home_score: null, away_score: null, status: 'scheduled' as const }
          : m
      )
    )
    setScores((prev) => {
      const next: Record<string, ScoreState> = { ...prev }
      for (const m of matches.filter((m) => m.rounds?.id === roundId)) {
        next[m.id] = { home: '', away: '', status: 'scheduled' }
      }
      return next
    })

    const roundName = rounds.find((r) => r.id === roundId)?.name ?? 'round'
    setCalcAllDone(
      `${roundName} cleared — ${data.matchesCleared} matches, ` +
      `${data.predictionsReset} predictions reset, ${data.membersUpdated} members updated.`
    )
    setTimeout(() => setCalcAllDone(null), 8000)
  }

  // ── Derived display data ──────────────────────────────────────────────────

  const TBD_RE = /^(W Match|L Match|W Group|RU Group|Best 3rd)/
  const isTeamTBD = (team: string) => !team || TBD_RE.test(team)

  const selectedRound = rounds.find((r) => r.id === selectedRoundId)
  const isKnockoutRound = selectedRoundId !== null &&
    selectedRound !== undefined &&
    !selectedRound.name.startsWith('Group Stage')

  // Cached team option arrays — stable across renders
  const allTeamOptions  = useMemo(() => getTeamOptions('en'),       [])
  const allTeamIcons    = useMemo(() => getTeamFlagCodesMap('en'),   [])
  const bonusPlayerOptions = useMemo(() =>
    WC2026_PLAYERS.map((p) => `${p.name} (${p.country})`).sort((a, b) => a.localeCompare(b)), [])
  const bonusGKOptions  = useMemo(() =>
    WC2026_PLAYERS.filter((p) => p.position === 'goalkeeper').map((p) => `${p.name} (${p.country})`).sort((a, b) => a.localeCompare(b)), [])

  // TBD matches in the selected knockout round
  const tbdMatches = useMemo(() => {
    if (!isKnockoutRound) return []
    return matches.filter(
      (m) => m.rounds?.id === selectedRoundId && (isTeamTBD(m.home_team) || isTeamTBD(m.away_team))
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKnockoutRound, selectedRoundId, matches])

  // Resolved knockout matches (both teams set, but bracket entry exists → can reset)
  const resolvedKnockoutMatches = useMemo(() => {
    if (!isKnockoutRound) return []
    return matches.filter((m) => {
      if (m.rounds?.id !== selectedRoundId) return false
      if (isTeamTBD(m.home_team) || isTeamTBD(m.away_team)) return false
      return getBracketEntry(m) !== null
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKnockoutRound, selectedRoundId, matches])

  const filteredMatches = useMemo(
    () => selectedRoundId ? matches.filter((m) => m.rounds?.id === selectedRoundId) : matches,
    [matches, selectedRoundId]
  )

  const groupedByRound = useMemo(() => {
    const groups: { round: Round; matches: Match[] }[] = []
    const roundMap = new Map(rounds.map((r) => [r.id, r]))

    for (const match of filteredMatches) {
      const roundId = match.rounds?.id
      const round = (roundId != null ? roundMap.get(roundId) : null) ?? { id: roundId ?? 0, name: match.rounds?.name ?? 'Unknown' }
      let group = groups.find((g) => g.round.id === round.id)
      if (!group) {
        group = { round, matches: [] }
        groups.push(group)
      }
      group.matches.push(match)
    }

    return groups
  }, [filteredMatches, rounds])

  // ── Loading / access denied states ───────────────────────────────────────

  if (adminStatus === 'checking') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded-xl w-48" />
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (adminStatus === 'denied') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10">
          <span className="text-4xl">🚫</span>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-500">You don't have permission to view this page.</p>
          <p className="mt-1 text-xs text-gray-400">Redirecting to dashboard…</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const isCalcAllRunning = calcAllProgress !== null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Match Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update scores and match status. Click "Calc Scores" after entering a result.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sync */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {syncing ? (
              <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Syncing…</>
            ) : '🔄 Sync Scores Now'}
          </button>

          {/* Calculate All */}
          <button
            onClick={handleCalculateAll}
            disabled={isCalcAllRunning}
            className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {isCalcAllRunning
              ? `🧮 Calculating… ${calcAllProgress!.current}/${calcAllProgress!.total}`
              : '🧮 Calculate All Scores'}
          </button>

          {/* Clear All */}
          <button
            onClick={() => setClearConfirmOpen(true)}
            disabled={clearing}
            className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60 transition-colors border border-red-200"
          >
            🗑️ Clear All Results
          </button>
        </div>
      </div>

      {/* Bulk action feedback */}
      <div className="flex flex-wrap items-center gap-3">
        {lastSyncTime && (
          <p className="text-xs text-gray-400">Last sync: {lastSyncTime.toLocaleTimeString()}</p>
        )}
        {syncResult && (
          <div className={`text-xs rounded-lg px-3 py-1.5 border ${
            syncResult.errors.length > 0
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            <span className="font-semibold">
              {syncResult.updated} updated · {syncResult.finished} scored
            </span>
            {syncResult.errors.length > 0 && (
              <span className="ml-2 text-amber-600">({syncResult.errors.length} errors)</span>
            )}
          </div>
        )}
        {calcAllDone && (
          <div className="text-xs rounded-lg px-3 py-1.5 border bg-green-50 border-green-200 text-green-700 font-semibold">
            {calcAllDone}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-3">
          <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* ── Round selector ── */}
      <div className="flex items-center gap-3">
        <label htmlFor="round-select" className="text-sm font-medium text-gray-700 shrink-0">
          Filter by round:
        </label>
        <select
          id="round-select"
          value={showBonus ? 'bonus' : (selectedRoundId ?? '')}
          onChange={(e) => {
            if (e.target.value === 'bonus') {
              setShowBonus(true)
              setSelectedRoundId(null)
            } else {
              setShowBonus(false)
              setSelectedRoundId(e.target.value === '' ? null : Number(e.target.value))
            }
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-green-500 focus:outline-none bg-white"
        >
          <option value="">All Rounds ({matches.length} matches)</option>
          {rounds.map((r) => {
            const count = matches.filter((m) => m.rounds?.id === r.id).length
            return (
              <option key={r.id} value={r.id}>
                {r.name} ({count})
              </option>
            )
          })}
          <option value="bonus">🏆 Bonus Results</option>
        </select>
      </div>

      {/* ── Bonus Results panel ── */}
      {showBonus && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">🏆 Official Bonus Results</h2>
            <p className="mt-1 text-sm text-gray-500">
              Saving will recalculate bonus points for <strong>all users across all pools</strong>.
            </p>
          </div>

          {bonusLoading ? (
            <div className="space-y-4 animate-pulse">
              {BONUS_OFFICIAL_FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="h-3 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-10 bg-gray-200 rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {BONUS_OFFICIAL_FIELDS.map((field) => {
                const value = bonusResults[field.key] ?? ''
                const opts  = field.type === 'team' ? allTeamOptions : field.type === 'goalkeeper' ? bonusGKOptions : bonusPlayerOptions
                const icons = field.type === 'team' ? allTeamIcons : undefined
                return (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                    <SearchableSelect
                      options={opts}
                      value={value}
                      icons={icons}
                      placeholder={`Search ${field.label}…`}
                      onChange={(v) => setBonusResults((prev) => ({ ...prev, [field.key]: v }))}
                    />
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap pt-1">
            <button
              onClick={handleSaveBonusResults}
              disabled={bonusSaving || bonusLoading || bonusClearing}
              className="rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition-colors"
            >
              {bonusSaving ? 'Saving…' : 'Save & Calculate Points'}
            </button>
            <button
              onClick={() => setBonusClearConfirm(true)}
              disabled={bonusSaving || bonusLoading || bonusClearing}
              className="rounded-full bg-red-100 border border-red-200 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60 transition-colors"
            >
              {bonusClearing ? 'Clearing…' : '🗑️ Clear Results'}
            </button>
            {bonusSaved && (
              <span className="text-sm text-green-700 font-medium">✓ Saved! Bonus points updated for all users.</span>
            )}
            {bonusClearSaved && (
              <span className="text-sm text-green-700 font-medium">✓ Cleared! Bonus points reset to 0.</span>
            )}
            {bonusError && (
              <span className="text-sm text-red-600">{bonusError}</span>
            )}
          </div>
        </section>
      )}

      {!showBonus && <>

      {/* ── Update Knockout Teams ── */}
      {isKnockoutRound && (tbdMatches.length > 0 || resolvedKnockoutMatches.length > 0) && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">
            ⚽ Update Knockout Teams
            <span className="ml-2 text-xs font-normal text-gray-400">
              {tbdMatches.length > 0 && `${tbdMatches.length} TBD`}
              {tbdMatches.length > 0 && resolvedKnockoutMatches.length > 0 && ' · '}
              {resolvedKnockoutMatches.length > 0 && `${resolvedKnockoutMatches.length} assigned`}
            </span>
          </h2>

          {/* TBD matches — assign teams */}
          {tbdMatches.map((match) => {
            const edit = teamEdits[match.id] ?? { home: '', away: '' }
            return (
              <div key={match.id} className="rounded-xl bg-white border border-gray-100 p-4 space-y-3">
                <p className="text-xs text-gray-400">{formatMatchTime(match.match_date, match.match_time ?? '00:00:00', 'en')}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Home — <span className="text-amber-700 font-mono">{match.home_team || 'TBD'}</span>
                    </label>
                    <SearchableSelect
                      options={allTeamOptions}
                      icons={allTeamIcons}
                      value={edit.home}
                      placeholder="Select home team…"
                      onChange={(v) => setTeamEdits((prev) => ({ ...prev, [match.id]: { ...edit, home: v } }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Away — <span className="text-amber-700 font-mono">{match.away_team || 'TBD'}</span>
                    </label>
                    <SearchableSelect
                      options={allTeamOptions}
                      icons={allTeamIcons}
                      value={edit.away}
                      placeholder="Select away team…"
                      onChange={(v) => setTeamEdits((prev) => ({ ...prev, [match.id]: { ...edit, away: v } }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleUpdateTeams(match.id)}
                    disabled={savingTeams[match.id] || (!edit.home && !edit.away)}
                    className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {savingTeams[match.id] ? 'Saving…' : 'Update Teams'}
                  </button>
                  {teamSaved[match.id] && (
                    <span className="text-xs text-green-700 font-medium">✓ Updated</span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Resolved matches — show teams + reset option */}
          {resolvedKnockoutMatches.length > 0 && (
            <>
              {tbdMatches.length > 0 && <div className="border-t border-amber-200" />}
              <p className="text-xs font-medium text-gray-500">Assigned matches — click Reset to restore TBD</p>
              {resolvedKnockoutMatches.map((match) => {
                const bracket = getBracketEntry(match)
                return (
                  <div key={match.id} className="rounded-xl bg-white border border-gray-100 p-4">
                    <p className="text-xs text-gray-400 mb-2">{formatMatchTime(match.match_date, match.match_time ?? '00:00:00', 'en')}</p>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm font-medium text-gray-900">
                        {match.home_team} <span className="text-gray-400 font-normal">vs</span> {match.away_team}
                      </div>
                      <div className="flex items-center gap-2">
                        {teamSaved[match.id] && (
                          <span className="text-xs text-green-700 font-medium">✓ Reset</span>
                        )}
                        {bracket && (
                          <button
                            onClick={() => setResetConfirmMatchId(match.id)}
                            disabled={savingTeams[match.id]}
                            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50 transition-colors"
                          >
                            ↩️ Reset to TBD
                          </button>
                        )}
                      </div>
                    </div>
                    {bracket && (
                      <p className="mt-1 text-xs text-gray-400">
                        Will restore: <span className="font-mono">{bracket.home}</span> vs <span className="font-mono">{bracket.away}</span>
                      </p>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </section>
      )}

      {/* ── Reset to TBD confirmation dialog ── */}
      {resetConfirmMatchId !== null && (() => {
        const match = matches.find((m) => m.id === resetConfirmMatchId)
        return match ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">↩️</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Reset to TBD?</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    This will reset <strong>{match.home_team} vs {match.away_team}</strong> back to{' '}
                    <strong className="font-mono">{getBracketEntry(match)?.home ?? '?'}</strong> vs{' '}
                    <strong className="font-mono">{getBracketEntry(match)?.away ?? '?'}</strong>.
                    All predictions for this match will be <strong className="text-red-600">permanently deleted</strong>.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => handleResetTBD(resetConfirmMatchId)}
                  disabled={savingTeams[resetConfirmMatchId]}
                  className="flex-1 rounded-full bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors"
                >
                  {savingTeams[resetConfirmMatchId] ? 'Resetting…' : 'Yes, reset to TBD'}
                </button>
                <button
                  onClick={() => setResetConfirmMatchId(null)}
                  disabled={savingTeams[resetConfirmMatchId]}
                  className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null
      })()}

      {/* ── Matches grouped by round ── */}
      {groupedByRound.length === 0 ? (
        <p className="text-sm text-gray-400">No matches found.</p>
      ) : (
        groupedByRound.map(({ round, matches: roundMatches }) => (
          <section key={round.id}>
            {/* Round header — always shown so the Clear Round button is accessible */}
            <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100 flex items-center justify-between">
              <span>{round.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-normal text-gray-400">{roundMatches.length} matches</span>
                <button
                  onClick={() => setClearRoundConfirm(round.id)}
                  disabled={clearingRoundId === round.id}
                  className="text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-full px-2.5 py-0.5 transition-colors disabled:opacity-50"
                >
                  {clearingRoundId === round.id ? 'Clearing…' : '🗑️ Clear Round'}
                </button>
              </div>
            </h2>

            <div className="space-y-2">
              {roundMatches.map((match) => {
                const sc = scores[match.id] ?? { home: '', away: '', status: 'scheduled' }
                const homeDisplay = match.home_team || 'TBD'
                const awayDisplay = match.away_team || 'TBD'
                const isTbd = !match.home_team || !match.away_team

                return (
                  <div
                    key={match.id}
                    className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    {/* Match info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {match.group_name && (
                          <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                            Group {match.group_name}
                          </span>
                        )}
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 border ${
                          sc.status === 'live'      ? 'text-red-700 bg-red-50 border-red-200' :
                          sc.status === 'finished'  ? 'text-gray-500 bg-gray-50 border-gray-200' :
                          sc.status === 'cancelled' ? 'text-orange-700 bg-orange-50 border-orange-200' :
                                                      'text-amber-700 bg-amber-50 border-amber-200'
                        }`}>
                          {sc.status}
                        </span>
                        {isTbd && (
                          <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
                            TBD
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm leading-tight">
                        {homeDisplay} <span className="text-gray-400 font-normal">vs</span> {awayDisplay}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatMatchTime(match.match_date, match.match_time ?? '00:00:00', 'en')}
                      </p>
                    </div>

                    {/* Score inputs */}
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number" min={0} max={20} placeholder="–"
                        value={sc.home}
                        onChange={(e) => setScores((s) => ({ ...s, [match.id]: { ...sc, home: e.target.value } }))}
                        className="w-12 rounded-lg border border-gray-300 px-1 py-1.5 text-sm text-center font-mono focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                      />
                      <span className="text-gray-400 text-sm font-bold">–</span>
                      <input
                        type="number" min={0} max={20} placeholder="–"
                        value={sc.away}
                        onChange={(e) => setScores((s) => ({ ...s, [match.id]: { ...sc, away: e.target.value } }))}
                        className="w-12 rounded-lg border border-gray-300 px-1 py-1.5 text-sm text-center font-mono focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                      />
                    </div>

                    {/* Status select */}
                    <select
                      value={sc.status}
                      onChange={(e) => setScores((s) => ({ ...s, [match.id]: { ...sc, status: e.target.value } }))}
                      className="shrink-0 rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-700 focus:border-green-500 focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => saveMatch(match.id)}
                        disabled={saving[match.id]}
                        className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                      >
                        {saved[match.id] ? '✓' : saving[match.id] ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={() => calculateScores(match.id)}
                        disabled={calculating[match.id]}
                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-green-400 hover:text-green-700 disabled:opacity-60 transition-colors"
                      >
                        {calculating[match.id] ? '…' : 'Calc'}
                      </button>
                      {calcMsg[match.id] && (
                        <span className={`text-xs font-medium ${calcMsg[match.id].startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>
                          {calcMsg[match.id]}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}

      {/* ── Audit Log ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100 flex items-center justify-between">
          <span>Prediction Save Log</span>
          <span className="text-xs font-normal text-gray-400">last 50 entries</span>
        </h2>

        {auditLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        )}

        {auditError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{auditError}</div>
        )}

        {!auditLoading && auditLogs.length === 0 && !auditError && (
          <p className="text-sm text-gray-400">No audit log entries yet.</p>
        )}

        {!auditLoading && auditLogs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-gray-700">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">Time</th>
                  <th className="pb-2 pr-4 font-medium">User</th>
                  <th className="pb-2 pr-4 font-medium">Pool</th>
                  <th className="pb-2 pr-4 font-medium">Action</th>
                  <th className="pb-2 font-medium">Changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLogs.map((entry) => {
                  const changeCount = entry.payload?.changes?.length ?? 0
                  const matchCount  = entry.payload?.match_count ?? 0
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-4 tabular-nums text-gray-500 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                          timeZone: 'America/New_York',
                        })}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="font-medium">{entry.user_name ?? '—'}</div>
                        <div className="text-gray-400">{entry.user_email ?? entry.user_id.slice(0, 8)}</div>
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{entry.pool_name ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 font-medium">
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-2 tabular-nums">
                        {changeCount > 0
                          ? <span className="text-amber-700">{changeCount} changed</span>
                          : <span className="text-gray-400">{matchCount > 0 ? `${matchCount} saved` : '—'}</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      </>} {/* end !showBonus */}

      {/* ── Clear Bonus Results confirmation dialog ── */}
      {bonusClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Clear Bonus Results?</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  This will clear all official bonus answers and reset{' '}
                  <strong>all bonus points to 0</strong> for every user across all pools.
                  Leaderboard totals will be recalculated. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClearBonusResults}
                disabled={bonusClearing}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {bonusClearing ? 'Clearing…' : 'Yes, clear bonus results'}
              </button>
              <button
                onClick={() => setBonusClearConfirm(false)}
                disabled={bonusClearing}
                className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear All Results confirmation dialog ── */}
      {clearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Clear All Results?</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  This will clear <strong>ALL</strong> match scores, reset all matches to{' '}
                  <strong>Scheduled</strong>, zero out all prediction points, reset all leaderboard
                  points to 0, and reset all bonus prediction points. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {clearing ? 'Clearing…' : 'Yes, clear everything'}
              </button>
              <button
                onClick={() => setClearConfirmOpen(false)}
                disabled={clearing}
                className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clear Round Results confirmation dialog ── */}
      {clearRoundConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Clear Round Results?</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  This will clear all match scores for{' '}
                  <strong>{rounds.find((r) => r.id === clearRoundConfirm)?.name ?? 'this round'}</strong>,
                  reset those predictions' points to 0, and update each member's round and total points
                  on the leaderboard.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => handleClearRound(clearRoundConfirm)}
                disabled={clearingRoundId !== null}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {clearingRoundId !== null ? 'Clearing…' : 'Yes, clear this round'}
              </button>
              <button
                onClick={() => setClearRoundConfirm(null)}
                disabled={clearingRoundId !== null}
                className="flex-1 rounded-full border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
