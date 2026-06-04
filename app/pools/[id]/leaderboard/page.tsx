'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import PoolTabs from '@/components/PoolTabs'

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

export default function LeaderboardPage() {
  const { t } = useLang()
  const router = useRouter()
  const params = useParams()
  const poolId = params.id as string

  const [members, setMembers]       = useState<Member[]>([])
  const [bonuses, setBonuses]       = useState<Record<string, string>>({})
  const [bonusPoints, setBonusPoints] = useState<Record<string, number>>({})
  const [loading, setLoading]       = useState(true)
  const [poolName, setPoolName]     = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const roundCols = [
    { key: 'points_md1',   label: 'MD1' },
    { key: 'points_md2',   label: 'MD2' },
    { key: 'points_md3',   label: 'MD3' },
    { key: 'points_r32',   label: 'R32' },
    { key: 'points_r16',   label: 'R16' },
    { key: 'points_qf',    label: 'QF'  },
    { key: 'points_sf',    label: 'SF'  },
    { key: 'points_final', label: 'FIN' },
  ]

  // Column totals
  const colTotals = roundCols.reduce<Record<string, number>>((acc, c) => {
    acc[c.key] = members.reduce((s, m) => s + ((m as unknown as Record<string, number>)[c.key] || 0), 0)
    return acc
  }, {})
  const grandTotal = members.reduce((s, m) => s + m.total_points, 0)
  const bonusTotal = members.reduce((s, m) => s + (bonusPoints[m.user_id] ?? 0), 0)

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">

      {/* Back + nav tabs */}
      <div>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          {t.leaderboard.back}
        </Link>
        <div className="mt-4">
          <PoolTabs poolId={poolId} activeTab="standings" />
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-gray-900">{t.leaderboard.title}</h1>
        <p className="text-sm text-gray-500">{poolName}</p>
      </div>

      {members.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-400">{t.leaderboard.noMembers}</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 w-10">#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400">{t.leaderboard.player}</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-green-700">{t.leaderboard.total}</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-amber-600 hidden sm:table-cell">
                  {t.leaderboard.bonus}
                </th>
                {roundCols.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-right text-xs font-medium text-gray-400 hidden sm:table-cell">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map((m, idx) => {
                const rank = idx + 1
                const bPts = bonusPoints[m.user_id] ?? 0
                return (
                  <tr
                    key={m.id}
                    className={`${rank <= 3 ? 'bg-green-50/40' : ''} hover:bg-gray-50 transition-colors`}
                  >
                    <td className="px-3 py-3 font-bold text-gray-500 w-10">
                      {MEDAL[rank] ?? rank}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">{m.full_name}</div>
                      {bonuses[m.user_id] && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          🏆 {bonuses[m.user_id]}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-green-700 tabular-nums">
                      {m.total_points}
                    </td>
                    <td className="px-2 py-3 text-right text-amber-600 font-semibold tabular-nums hidden sm:table-cell">
                      {bPts > 0 ? bPts : '–'}
                    </td>
                    {roundCols.map((c) => (
                      <td key={c.key} className="px-2 py-3 text-right text-gray-500 tabular-nums hidden sm:table-cell">
                        {(m as unknown as Record<string, number>)[c.key] || '–'}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-3 py-2 text-xs font-semibold text-gray-500" colSpan={2}>
                  {t.leaderboard.roundTotals}
                </td>
                <td className="px-3 py-2 text-right font-bold text-green-700 tabular-nums text-sm">
                  {grandTotal}
                </td>
                <td className="px-2 py-2 text-right font-semibold text-amber-600 tabular-nums text-sm hidden sm:table-cell">
                  {bonusTotal > 0 ? bonusTotal : '–'}
                </td>
                {roundCols.map((c) => (
                  <td key={c.key} className="px-2 py-2 text-right text-gray-600 tabular-nums text-sm hidden sm:table-cell">
                    {colTotals[c.key] || '–'}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">Updates every 30 seconds</p>
    </div>
  )
}
