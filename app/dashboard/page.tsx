'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'

type MemberStatus = 'pending' | 'approved' | 'rejected' | 'removed'

interface OwnedPool {
  id: string
  name: string
  description: string | null
  invite_code: string
  approvedCount: number
  pendingCount: number
  myPoints: number | null
  myRank: number | null
}

interface JoinedPool {
  id: string
  name: string
  description: string | null
  invite_code: string
  status: MemberStatus
  total_points: number
  myRank: number | null
  approvedCount: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLang()
  const d = t.dashboard

  const [firstName, setFirstName]     = useState<string>('')
  const [email, setEmail]             = useState<string>('')
  const [ownedPools, setOwnedPools]   = useState<OwnedPool[]>([])
  const [joinedPools, setJoinedPools] = useState<JoinedPool[]>([])
  const [loading, setLoading]         = useState(true)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAll() {
      const res = await fetch('/api/dashboard')
      if (res.status === 401) { router.push('/auth/login'); return }
      if (!res.ok) { setLoading(false); return }

      const data = await res.json()
      setFirstName(data.firstName ?? '')
      setEmail(data.email ?? '')
      setOwnedPools(data.ownedPools ?? [])
      setJoinedPools(data.joinedPools ?? [])
      setLoading(false)
    }

    fetchAll()
  }, [router])

  async function handleArchive(poolId: string) {
    const res = await fetch(`/api/pools/${poolId}/archive`, { method: 'PATCH' })
    if (res.ok) setOwnedPools((prev) => prev.filter((p) => p.id !== poolId))
    setArchivingId(null)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-100 rounded-xl w-64" />
          <div className="h-4 bg-gray-100 rounded w-40" />
        </div>
        <div className="animate-pulse grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-12">

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {d.welcome}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">{email}</p>
      </div>

      {/* ── PRIMARY: Pools I'm In ── */}
      <section>
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{d.poolsImIn}</h2>
            <p className="mt-0.5 text-sm text-gray-500 max-w-lg">{d.poolsImInSubtitle}</p>
          </div>
          <Link
            href="/pools/join"
            className="shrink-0 text-sm font-medium border border-gray-200 rounded-full px-4 py-1.5 hover:border-green-300 hover:text-green-700 transition-colors"
          >
            {d.joinPool}
          </Link>
        </div>

        {joinedPools.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-10 px-6 text-center mt-4">
            <span className="text-4xl">🔗</span>
            <p className="mt-3 text-sm text-gray-500 max-w-sm mx-auto">{d.noJoinedFriendly}</p>
            <Link
              href="/pools/join"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-green-600 text-white font-semibold px-6 py-2.5 hover:bg-green-700 transition-colors text-sm"
            >
              {d.joinPool}
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinedPools.map((pool) => {
              const badge = ({
                pending:  { label: d.badgePending,  cls: 'text-amber-700 bg-amber-50 border-amber-200' },
                approved: { label: d.badgeApproved, cls: 'text-green-700 bg-green-50 border-green-200' },
                rejected: { label: d.badgeRejected, cls: 'text-gray-400 bg-gray-50 border-gray-200' },
                removed:  { label: d.badgeRejected, cls: 'text-gray-400 bg-gray-50 border-gray-200' },
              } as Record<string, { label: string; cls: string }>)[pool.status]

              return (
                <div
                  key={pool.id}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 leading-snug">{pool.name}</h3>
                    <span className={`shrink-0 text-xs font-semibold border rounded-full px-2 py-0.5 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {pool.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{pool.description}</p>
                  )}

                  {pool.status === 'approved' && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-green-600 text-sm">{pool.total_points}</span>{' '}
                        {d.pts}
                      </p>
                      {pool.myRank !== null && (
                        <p className="text-xs text-gray-400">
                          {d.rank}: <span className="font-semibold text-gray-600">#{pool.myRank}</span>{' '}
                          {d.rankOf} {pool.approvedCount}
                        </p>
                      )}
                    </div>
                  )}

                  {pool.status === 'pending' && (
                    <p className="text-xs text-amber-600">{d.awaitApproval}</p>
                  )}

                  {pool.status === 'approved' && (
                    <Link
                      href={`/pools/${pool.id}`}
                      className="mt-auto block text-center text-sm font-semibold text-white bg-green-600 rounded-full py-2.5 hover:bg-green-700 transition-colors"
                    >
                      {d.viewAndPredict}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── SECONDARY: My Pools (owned) ── */}
      <section>
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h2 className="text-base font-semibold text-gray-500">{d.myPools}</h2>
            <p className="mt-0.5 text-sm text-gray-400">{d.myPoolsSubtitle}</p>
          </div>
          <Link
            href="/pools/create"
            className="shrink-0 text-sm font-medium border border-gray-200 rounded-full px-4 py-1.5 hover:border-green-300 hover:text-green-700 transition-colors"
          >
            + {d.createPool}
          </Link>
        </div>

        {ownedPools.length === 0 ? (
          <div className="mt-4 py-5 px-4 text-center rounded-2xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">{d.wantOwnPool}</p>
            <Link
              href="/pools/create"
              className="mt-1.5 inline-flex text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
            >
              {d.createPool} →
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedPools.map((pool) => (
              <div
                key={pool.id}
                className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-gray-900 leading-snug">{pool.name}</h3>
                  <span className="shrink-0 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                    Admin
                  </span>
                </div>

                {pool.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{pool.description}</p>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{d.code}</span>
                  <span className="text-sm font-mono font-bold tracking-widest text-green-700 bg-green-50 border border-green-100 rounded-lg px-2 py-0.5">
                    {pool.invite_code}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{pool.approvedCount} {d.approvedMembers}</span>
                  {pool.pendingCount > 0 && (
                    <span className="font-medium text-amber-600">
                      {pool.pendingCount} {d.pendingReqs}
                    </span>
                  )}
                </div>

                {pool.myPoints !== null && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold text-green-600 text-sm">{pool.myPoints}</span>{' '}
                      {d.yourScore}
                    </p>
                    {pool.myRank !== null && (
                      <p className="text-xs text-gray-400">
                        {d.rank}: <span className="font-semibold text-gray-600">#{pool.myRank}</span>{' '}
                        {d.rankOf} {pool.approvedCount}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-auto flex gap-2">
                  {pool.myPoints !== null && (
                    <Link
                      href={`/pools/${pool.id}/predict`}
                      className="flex-1 text-center text-sm font-semibold text-white bg-green-600 rounded-full py-1.5 hover:bg-green-700 transition-colors"
                    >
                      {d.makePredictions}
                    </Link>
                  )}
                  <Link
                    href={`/pools/${pool.id}/admin`}
                    className={`text-center text-sm font-medium text-green-700 border border-green-200 rounded-full py-1.5 hover:bg-green-50 transition-colors ${pool.myPoints !== null ? 'px-4' : 'flex-1'}`}
                  >
                    {d.manage}
                  </Link>
                </div>

                {archivingId === pool.id ? (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 space-y-2">
                    <p className="text-xs text-red-700">{d.archiveConfirm}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleArchive(pool.id)}
                        className="text-xs font-semibold text-white bg-red-600 rounded-full px-3 py-1 hover:bg-red-700 transition-colors"
                      >
                        {d.archivePool}
                      </button>
                      <button
                        onClick={() => setArchivingId(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setArchivingId(pool.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors text-left"
                  >
                    {d.archivePool}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
