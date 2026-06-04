'use client'

import { useState } from 'react'
import { useLang } from '@/components/LanguageContext'

interface MemberRowProps {
  poolId: string
  memberId: string
  userId: string
  fullName: string
  email: string
  status: 'pending' | 'approved' | 'rejected' | 'removed'
  onRefresh: () => void
}

export default function MemberRow({
  poolId,
  memberId,
  userId,
  fullName,
  email,
  status,
  onRefresh,
}: MemberRowProps) {
  const { t } = useLang()
  const [loading, setLoading]             = useState<'approve' | 'reject' | 'remove' | 'restore' | null>(null)
  const [confirmingRemove, setConfirming] = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  async function handleAction(action: 'approve' | 'reject' | 'restore') {
    setError(null)
    setLoading(action)

    const res = await fetch(`/api/pools/${poolId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, action }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(null)
      return
    }

    onRefresh()
    setLoading(null)
  }

  async function handleRemove() {
    setError(null)
    setLoading('remove')

    const res = await fetch(`/api/pools/${poolId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, userId }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(null)
      setConfirming(false)
      return
    }

    onRefresh()
  }

  const removeLabel = loading === 'remove' ? '…' : t.admin.removeButton

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{fullName || '—'}</p>
          <p className="text-xs text-gray-500 truncate">{email}</p>
          {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
        </div>

        {/* ── Pending: approve / reject ── */}
        {status === 'pending' && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => handleAction('approve')}
              disabled={loading !== null}
              className="text-xs font-semibold text-white bg-green-600 rounded-full px-3 py-1 hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading === 'approve' ? '…' : 'Approve'}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={loading !== null}
              className="text-xs font-medium text-red-600 border border-red-200 rounded-full px-3 py-1 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {loading === 'reject' ? '…' : 'Reject'}
            </button>
          </div>
        )}

        {/* ── Approved / Rejected: badge + remove ── */}
        {(status === 'approved' || status === 'rejected') && !confirmingRemove && (
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${
              status === 'approved'
                ? 'text-green-700 bg-green-50'
                : 'text-gray-400 bg-gray-50'
            }`}>
              {status === 'approved' ? 'Approved' : 'Rejected'}
            </span>
            <button
              onClick={() => setConfirming(true)}
              disabled={loading !== null}
              className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
            >
              {t.admin.removeButton}
            </button>
          </div>
        )}

        {/* ── Inline remove confirmation ── */}
        {(status === 'approved' || status === 'rejected') && confirmingRemove && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500 hidden sm:block">Remove?</span>
            <button
              onClick={handleRemove}
              disabled={loading === 'remove'}
              className="text-xs font-semibold text-white bg-red-600 rounded-full px-3 py-1 hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {removeLabel}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={loading === 'remove'}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Removed: restore button ── */}
        {status === 'removed' && (
          <button
            onClick={() => handleAction('restore')}
            disabled={loading !== null}
            className="text-xs font-semibold text-green-700 border border-green-200 rounded-full px-3 py-1 hover:bg-green-50 disabled:opacity-50 transition-colors shrink-0"
          >
            {loading === 'restore' ? '…' : t.admin.restore}
          </button>
        )}
      </div>
    </div>
  )
}
