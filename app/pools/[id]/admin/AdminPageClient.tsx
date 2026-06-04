'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'
import CopyButton from './CopyButton'
import MemberRow from './MemberRow'

interface Profile {
  full_name: string
  email: string
}

interface Member {
  id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected' | 'removed'
  joined_at: string
  total_points: number
  profiles: Profile | null
}

interface Pool {
  id: string
  name: string
  description: string | null
  invite_code: string
  owner_id: string
  auto_approve: boolean
}

const STATUS_ORDER: Record<string, number> = { approved: 0, pending: 1, rejected: 2, removed: 3 }

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

export default function AdminPageClient({ poolId }: { poolId: string }) {
  const router = useRouter()
  const { t } = useLang()

  const [pool, setPool]               = useState<Pool | null>(null)
  const [members, setMembers]         = useState<Member[]>([])
  const [loading, setLoading]         = useState(true)
  const [fetchError, setFetchError]   = useState<string | null>(null)
  const [refreshKey, setRefreshKey]   = useState(0)
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [archiving, setArchiving]     = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [removedExpanded, setRemovedExpanded] = useState(false)

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setFetchError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: poolData, error: poolError } = await supabase
        .from('pools')
        .select('id, name, description, invite_code, owner_id, auto_approve')
        .eq('id', poolId)
        .eq('is_archived', false)
        .single()

      if (poolError || !poolData) {
        setFetchError('Pool not found.')
        setLoading(false)
        return
      }

      if (poolData.owner_id !== user.id) {
        router.push(`/pools/${poolId}`)
        return
      }

      setPool(poolData)

      const { data: membersData } = await supabase
        .from('pool_members')
        .select('id, status, user_id, joined_at, total_points, profiles(full_name, email)')
        .eq('pool_id', poolId)

      setMembers((membersData ?? []) as unknown as Member[])
      setLoading(false)
    }

    fetchData()
  }, [poolId, refreshKey, router])

  async function handleArchive() {
    setArchiving(true)
    setArchiveError(null)

    const res = await fetch(`/api/pools/${poolId}/archive`, { method: 'PATCH' })

    if (!res.ok) {
      const data = await res.json()
      setArchiveError(data.error ?? 'Something went wrong')
      setArchiving(false)
      return
    }

    router.push('/dashboard')
  }

  function handleExport() {
    if (!pool) return

    const statusLabel: Record<string, string> = {
      approved: 'Approved',
      pending:  'Pending',
      rejected: 'Rejected',
      removed:  'Removed',
    }

    const sorted = [...members].sort((a, b) => {
      const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      if (sd !== 0) return sd
      return (a.profiles?.full_name ?? '').localeCompare(b.profiles?.full_name ?? '')
    })

    const headers = ['Full Name', 'Email', 'Status', 'Joined Date', 'Total Points']

    const rows = sorted.map((m) => [
      m.profiles?.full_name ?? '',
      m.profiles?.email ?? '',
      statusLabel[m.status] ?? m.status,
      m.joined_at ? fmtDate(m.joined_at) : '',
      m.total_points ?? 0,
    ])

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

    // Auto-fit column widths
    ws['!cols'] = headers.map((h, i) => ({
      wch: Math.max(h.length, ...rows.map((r) => String(r[i] ?? '').length)) + 2,
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, t.admin.exportFilename)
    XLSX.writeFile(wb, `${pool.name} - ${t.admin.exportFilename}.xlsx`)
  }

  const pending  = members.filter((m) => m.status === 'pending')
  const approved = members.filter((m) => m.status === 'approved')
  const rejected = members.filter((m) => m.status === 'rejected')
  const removed  = members.filter((m) => m.status === 'removed')

  const inviteUrl = pool ? `${window.location.origin}/join/${pool.invite_code}` : ''

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-gray-100 rounded w-32" />
          <div className="h-8 bg-gray-100 rounded-xl w-64" />
          <div className="h-28 bg-gray-100 rounded-2xl" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (fetchError || !pool) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
        <p className="text-gray-500 mb-4">{fetchError ?? 'Pool not found.'}</p>
        <Link href="/dashboard" className="text-sm font-medium text-green-600 hover:text-green-700">
          ← Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
        ← Back to dashboard
      </Link>

      {/* Pool header */}
      <div className="mt-4 mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{pool.name}</h1>
            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
              Admin
            </span>
            {pool.auto_approve ? (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
                🔓 {t.admin.openPool}
              </span>
            ) : (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                🔐 {t.admin.approvalRequired}
              </span>
            )}
          </div>
          {pool.description && (
            <p className="text-sm text-gray-500">{pool.description}</p>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={members.length === 0}
          className="shrink-0 text-sm font-medium border border-gray-200 rounded-full px-4 py-1.5 hover:border-green-300 hover:text-green-700 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          📥 {t.admin.exportMembers}
        </button>
      </div>

      {/* Invite link */}
      <section className="mb-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Invite Link</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">Share this link with friends</p>
            <p className="text-sm font-mono text-gray-800 truncate">{inviteUrl}</p>
          </div>
          <CopyButton text={inviteUrl} />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Code:{' '}
          <span className="font-mono font-semibold tracking-widest">{pool.invite_code}</span>
        </p>
      </section>

      {/* Pending requests */}
      <section className="mb-6 rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Pending Requests</h2>
          {pending.length > 0 && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
              {pending.length}
            </span>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-400">No pending requests.</p>
        ) : (
          pending.map((m) => (
            <MemberRow
              key={m.id}
              poolId={poolId}
              memberId={m.id}
              userId={m.user_id}
              fullName={m.profiles?.full_name ?? '(no name)'}
              email={m.profiles?.email ?? m.user_id}
              status="pending"
              onRefresh={handleRefresh}
            />
          ))
        )}
      </section>

      {/* Approved members */}
      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Approved Members</h2>
          <span className="text-xs text-gray-400">{approved.length}</span>
        </div>
        {approved.length === 0 ? (
          <p className="text-sm text-gray-400">No approved members yet.</p>
        ) : (
          approved.map((m) => (
            <MemberRow
              key={m.id}
              poolId={poolId}
              memberId={m.id}
              userId={m.user_id}
              fullName={m.profiles?.full_name ?? '(no name)'}
              email={m.profiles?.email ?? m.user_id}
              status="approved"
              onRefresh={handleRefresh}
            />
          ))
        )}
      </section>

      {/* Rejected */}
      {rejected.length > 0 && (
        <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Rejected</h2>
            <span className="text-xs text-gray-400">{rejected.length}</span>
          </div>
          {rejected.map((m) => (
            <MemberRow
              key={m.id}
              poolId={poolId}
              memberId={m.id}
              userId={m.user_id}
              fullName={m.profiles?.full_name ?? '(no name)'}
              email={m.profiles?.email ?? m.user_id}
              status="rejected"
              onRefresh={handleRefresh}
            />
          ))}
        </section>
      )}

      {/* Removed Members (collapsed by default) */}
      {removed.length > 0 && (
        <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={() => setRemovedExpanded((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-sm font-semibold text-gray-500">{t.admin.removedMembers}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{removed.length}</span>
              <span className="text-gray-400 text-xs">{removedExpanded ? '▲' : '▼'}</span>
            </div>
          </button>
          {removedExpanded && (
            <div className="mt-3">
              {removed.map((m) => (
                <MemberRow
                  key={m.id}
                  poolId={poolId}
                  memberId={m.id}
                  userId={m.user_id}
                  fullName={m.profiles?.full_name ?? '(no name)'}
                  email={m.profiles?.email ?? m.user_id}
                  status="removed"
                  onRefresh={handleRefresh}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Archive Pool */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Danger Zone</h2>
        <p className="text-xs text-gray-400 mb-4">
          Archiving hides this pool from all views but preserves all data.
        </p>

        {archiveError && (
          <p className="text-xs text-red-600 mb-3">{archiveError}</p>
        )}

        {archiveConfirm ? (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-3">
            <p className="text-sm text-red-700">{t.admin.archiveConfirm}</p>
            <div className="flex gap-3">
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="text-sm font-semibold text-white bg-red-600 rounded-full px-4 py-1.5 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {archiving ? t.admin.archiving : t.admin.archivePool}
              </button>
              <button
                onClick={() => setArchiveConfirm(false)}
                disabled={archiving}
                className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setArchiveConfirm(true)}
            className="text-sm font-medium text-red-600 border border-red-200 rounded-full px-4 py-1.5 hover:bg-red-50 transition-colors"
          >
            {t.admin.archivePool}
          </button>
        )}
      </section>
    </div>
  )
}
