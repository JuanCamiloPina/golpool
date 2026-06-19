'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import PoolTabs from '@/components/PoolTabs'
import { createClient } from '@/lib/supabase'

interface Member {
  id: string
  user_id: string
  total_points: number
  points_md1: number
  points_md2: number
  points_md3: number
  points_r32: number
  points_r16: number
  points_qf: number
  points_sf: number
  points_final: number
  full_name: string
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

const ROUND_COLS = [
  { key: 'points_md1',   label: 'MD1' },
  { key: 'points_md2',   label: 'MD2' },
  { key: 'points_md3',   label: 'MD3' },
  { key: 'points_r32',   label: 'R32' },
  { key: 'points_r16',   label: 'R16' },
  { key: 'points_qf',    label: 'QF'  },
  { key: 'points_sf',    label: 'SF'  },
  { key: 'points_final', label: 'FIN' },
] as const

type RoundKey = typeof ROUND_COLS[number]['key']

function pts(m: Member, key: RoundKey): number {
  return (m as unknown as Record<string, number>)[key] || 0
}

export default function LeaderboardPage() {
  const { t } = useLang()
  const router = useRouter()
  const params = useParams()
  const poolId = params.id as string

  const [members, setMembers]       = useState<Member[]>([])
  const [bonuses, setBonuses]       = useState<Record<string, string>>({})
  const [bonusPoints, setBonusPoints] = useState<Record<string, number>>({})
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [poolName, setPoolName]     = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Get the logged-in user's ID once on mount
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null)
    })
  }, [])

  async function fetchData() {
    const res = await fetch(`/api/pools/${poolId}/leaderboard`)
    if (res.status === 401) { router.push('/auth/login'); return }
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setPoolName(data.poolName ?? '')
    setMembers(data.members ?? [])
    setBonuses(data.bonuses ?? {})
    setBonusPoints(data.bonusPoints ?? {})
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId])

  // Pre-compute rank for O(1) lookup in render
  const rankMap = new Map(members.map((m, i) => [m.id, i + 1]))

  // Column averages
  const memberCount = members.length || 1
  const colAverages = ROUND_COLS.reduce<Record<string, number>>((acc, c) => {
    acc[c.key] = Math.round(members.reduce((s, m) => s + pts(m, c.key), 0) / memberCount)
    return acc
  }, {})
  const grandAverage = Math.round(members.reduce((s, m) => s + m.total_points, 0) / memberCount)
  const bonusAverage = Math.round(members.reduce((s, m) => s + (bonusPoints[m.user_id] ?? 0), 0) / memberCount)

  // Separate current user from the rest; members are already rank-sorted
  const myRow  = currentUserId ? (members.find(m => m.user_id === currentUserId) ?? null) : null
  const myRank = myRow ? rankMap.get(myRow.id)! : null
  const others = members.filter(m => m.user_id !== currentUserId)

  // Apply search filter — myRow always stays visible
  const searchTerm    = search.trim().toLowerCase()
  const filteredOthers = searchTerm
    ? others.filter(m => m.full_name.toLowerCase().includes(searchTerm))
    : others
  const shownCount = filteredOthers.length + (myRow ? 1 : 0)

  const tl = t.leaderboard

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 w-full">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-100 rounded-xl w-48" />
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const YouBadge = () => (
    <span className="ml-1.5 shrink-0 inline-block text-xs font-semibold text-green-700 bg-green-100 rounded-full px-1.5 py-0.5 leading-none">
      {tl.you}
    </span>
  )

  // ── Mobile card ────────────────────────────────────────────────────────────
  const MobileCard = ({ m, rank, isMe }: { m: Member; rank: number; isMe: boolean }) => {
    const bPts = bonusPoints[m.user_id] ?? 0
    return (
      <div className={`rounded-xl border p-3 ${isMe ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-white'}`}>
        {/* Top row: rank + name + total */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base font-bold text-gray-500 shrink-0 w-8 text-center">
              {MEDAL[rank] ?? `#${rank}`}
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 flex items-center flex-wrap text-sm leading-snug">
                <span className="truncate">{m.full_name}</span>
                {isMe && <YouBadge />}
              </div>
              {bonuses[m.user_id] && (
                <div className="text-xs text-gray-400 truncate">🏆 {bonuses[m.user_id]}</div>
              )}
            </div>
          </div>
          <span className="text-lg font-bold text-green-700 tabular-nums shrink-0">{m.total_points}</span>
        </div>

        {/* Compact round breakdown */}
        <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-9 gap-x-0.5 text-center">
          {ROUND_COLS.map((c) => (
            <div key={c.key} className="flex flex-col items-center">
              <span className="text-[9px] text-gray-400 leading-tight">{c.label}</span>
              <span className="text-xs font-medium text-gray-600 tabular-nums">{pts(m, c.key) || '–'}</span>
            </div>
          ))}
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-amber-500 leading-tight">{tl.bonus}</span>
            <span className="text-xs font-medium text-amber-600 tabular-nums">{bPts || '–'}</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Table row ──────────────────────────────────────────────────────────────
  const TableRow = ({ m, rank, isMe }: { m: Member; rank: number; isMe: boolean }) => {
    const bPts = bonusPoints[m.user_id] ?? 0
    return (
      <tr className={`${isMe ? 'bg-green-50' : rank <= 3 ? 'bg-green-50/40' : ''} hover:bg-gray-50 transition-colors`}>
        <td className="px-3 py-3 font-bold text-gray-500 w-10">
          {MEDAL[rank] ?? rank}
        </td>
        <td className="px-3 py-3">
          <div className="font-medium text-gray-900 flex items-center flex-wrap gap-x-1">
            {m.full_name}
            {isMe && <YouBadge />}
          </div>
          {bonuses[m.user_id] && (
            <div className="text-xs text-gray-400 mt-0.5">🏆 {bonuses[m.user_id]}</div>
          )}
        </td>
        <td className="px-3 py-3 text-right font-bold text-green-700 tabular-nums">{m.total_points}</td>
        <td className="px-2 py-3 text-right text-amber-600 font-semibold tabular-nums">
          {bPts > 0 ? bPts : '–'}
        </td>
        {ROUND_COLS.map((c) => (
          <td key={c.key} className="px-2 py-3 text-right text-gray-500 tabular-nums">
            {pts(m, c.key) || '–'}
          </td>
        ))}
      </tr>
    )
  }

  // colspan for the pinned-row divider: rank + player + total + bonus + rounds
  const totalCols = 4 + ROUND_COLS.length

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">

      {/* Back + nav tabs */}
      <div>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          {tl.back}
        </Link>
        <div className="mt-4">
          <PoolTabs poolId={poolId} activeTab="standings" />
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{tl.title}</h1>
        <p className="text-sm text-gray-500">{poolName}</p>
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-400">{tl.noMembers}</p>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tl.searchPlayer}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Result count — only shown while filtering */}
          {searchTerm && (
            <p className="text-xs text-gray-400 -mt-3">
              {tl.showing
                .replace('{n}', String(shownCount))
                .replace('{total}', String(members.length))}
            </p>
          )}

          {/* ── Mobile card layout (< sm) ────────────────────────────── */}
          <div className="sm:hidden space-y-2">
            {myRow && (
              <>
                <MobileCard m={myRow} rank={myRank!} isMe />
                {filteredOthers.length > 0 && (
                  <div className="border-t border-gray-200 my-1" />
                )}
              </>
            )}
            {filteredOthers.map((m) => (
              <MobileCard key={m.id} m={m} rank={rankMap.get(m.id)!} isMe={false} />
            ))}
          </div>

          {/* ── Desktop table layout (≥ sm) ─────────────────────────── */}
          <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 w-10">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">{tl.player}</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-green-700">{tl.total}</th>
                  <th className="px-2 py-2 text-right text-xs font-medium text-amber-600">{tl.bonus}</th>
                  {ROUND_COLS.map((c) => (
                    <th key={c.key} className="px-2 py-2 text-right text-xs font-medium text-gray-400">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* Pinned current-user row */}
                {myRow && (
                  <>
                    <TableRow m={myRow} rank={myRank!} isMe />
                    <tr aria-hidden>
                      <td colSpan={totalCols} className="p-0">
                        <div className="border-t border-gray-200" />
                      </td>
                    </tr>
                  </>
                )}
                {filteredOthers.map((m) => (
                  <TableRow key={m.id} m={m} rank={rankMap.get(m.id)!} isMe={false} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="px-3 py-2 text-xs font-semibold text-gray-500" colSpan={2}>
                    {tl.roundAverages}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-green-700 tabular-nums text-sm">
                    {grandAverage}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-amber-600 tabular-nums text-sm">
                    {bonusAverage > 0 ? bonusAverage : '–'}
                  </td>
                  {ROUND_COLS.map((c) => (
                    <td key={c.key} className="px-2 py-2 text-right text-gray-600 tabular-nums text-sm">
                      {colAverages[c.key] || '–'}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      <p className="text-xs text-gray-400 text-center">Updates every 30 seconds</p>
    </div>
  )
}
