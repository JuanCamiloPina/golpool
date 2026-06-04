'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface JoinButtonProps {
  poolId: string
  userId: string
  autoApprove: boolean
  /** Pass the existing membership ID when re-applying after rejection */
  existingMemberId?: string
}

export default function JoinButton({ poolId, userId: _userId, autoApprove, existingMemberId }: JoinButtonProps) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleJoin() {
    setState('loading')

    const res = await fetch(`/api/pools/${poolId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ existing_member_id: existingMemberId }),
    })

    const data = await res.json()

    if (!res.ok) {
      setErrorMsg(data.error ?? 'Something went wrong')
      setState('error')
      return
    }

    if (data.status === 'approved') {
      router.push(`/pools/${poolId}`)
      return
    }

    setState('success')
    setTimeout(() => router.push(`/pools/${poolId}`), 2000)
  }

  if (state === 'success') {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-800 text-center">
        <p className="font-semibold">Request sent!</p>
        <p className="mt-1">The pool admin needs to approve you before you can participate.</p>
      </div>
    )
  }

  return (
    <div>
      {state === 'error' && (
        <p className="mb-3 text-sm text-red-600">{errorMsg}</p>
      )}
      <button
        onClick={handleJoin}
        disabled={state === 'loading'}
        className="w-full rounded-full bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {state === 'loading'
          ? 'Joining…'
          : existingMemberId
          ? 'Re-apply to Join'
          : autoApprove
          ? 'Join Pool'
          : 'Request to Join'}
      </button>
    </div>
  )
}
