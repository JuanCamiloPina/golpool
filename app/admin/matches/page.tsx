'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatMatchDateTime } from '@/lib/date-utils'

interface Round {
  id: number
  name: string
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
          .select('id, group_name, home_team, away_team, match_date, venue, home_score, away_score, status, rounds(id, name)')
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
      [matchId]: res.ok ? `✓ ${d.updated} updated` : (d.error ?? 'Error'),
    }))
    setTimeout(() => setCalcMsg((s) => ({ ...s, [matchId]: '' })), 4000)
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
    const finishedMatches = matches.filter(
      (m) => m.status === 'finished' && m.home_score !== null && m.away_score !== null
    )
    if (finishedMatches.length === 0) {
      setCalcAllDone('No finished matches to calculate.')
      setTimeout(() => setCalcAllDone(null), 4000)
      return
    }

    setCalcAllProgress({ current: 0, total: finishedMatches.length })
    setCalcAllDone(null)

    for (let i = 0; i < finishedMatches.length; i++) {
      await fetch(`/api/matches/${finishedMatches[i].id}/calculate-scores`, { method: 'POST' })
      setCalcAllProgress({ current: i + 1, total: finishedMatches.length })
    }

    setCalcAllProgress(null)
    setCalcAllDone(`Done! ${finishedMatches.length} matches calculated.`)
    setTimeout(() => setCalcAllDone(null), 6000)
  }

  async function handleClearAll() {
    setClearing(true)
    const res = await fetch('/api/admin/matches/clear', { method: 'POST' })
    setClearing(false)
    setClearConfirmOpen(false)

    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Clear failed')
      return
    }

    // Reset local state
    setMatches((prev) =>
      prev.map((m) => ({ ...m, home_score: null, away_score: null, status: 'scheduled' as const }))
    )
    setScores((prev) => {
      const next: Record<string, ScoreState> = {}
      Object.keys(prev).forEach((k) => { next[k] = { home: '', away: '', status: 'scheduled' } })
      return next
    })
  }

  // ── Derived display data ──────────────────────────────────────────────────

  const filteredMatches = useMemo(
    () => selectedRoundId ? matches.filter((m) => m.rounds?.id === selectedRoundId) : matches,
    [matches, selectedRoundId]
  )

  // Group by round, preserving DB round order
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

        {/* Action buttons */}
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

      {/* Sync feedback */}
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
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* ── Round selector ── */}
      <div className="flex items-center gap-3">
        <label htmlFor="round-select" className="text-sm font-medium text-gray-700 shrink-0">
          Filter by round:
        </label>
        <select
          id="round-select"
          value={selectedRoundId ?? ''}
          onChange={(e) => setSelectedRoundId(e.target.value === '' ? null : Number(e.target.value))}
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
        </select>
      </div>

      {/* ── Matches grouped by round ── */}
      {groupedByRound.length === 0 ? (
        <p className="text-sm text-gray-400">No matches found.</p>
      ) : (
        groupedByRound.map(({ round, matches: roundMatches }) => (
          <section key={round.id}>
            {/* Round header — only show when viewing all rounds */}
            {selectedRoundId === null && (
              <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100 flex items-center justify-between">
                <span>{round.name}</span>
                <span className="text-xs font-normal text-gray-400">{roundMatches.length} matches</span>
              </h2>
            )}

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
                          sc.status === 'live'     ? 'text-red-700 bg-red-50 border-red-200' :
                          sc.status === 'finished' ? 'text-gray-500 bg-gray-50 border-gray-200' :
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
                      <p className="text-xs text-gray-400 mt-0.5">{formatMatchDateTime(match.match_date, 'en')}</p>
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
                        <span className="text-xs text-green-700 font-medium">{calcMsg[match.id]}</span>
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

      {/* ── Clear All Results confirmation dialog ── */}
      {clearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Clear All Results?</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  This will clear <strong>ALL</strong> match scores and reset all matches to{' '}
                  <strong>Scheduled</strong> status. Points will{' '}
                  <strong className="text-red-600">NOT</strong> be recalculated automatically.
                  Are you sure?
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

    </div>
  )
}
