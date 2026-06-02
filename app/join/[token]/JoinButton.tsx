'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface JoinButtonProps {
  poolId: string
  userId: string
  /** Pass the existing membership ID when re-applying after rejection */
  existingMemberId?: string
}

export default function JoinButton({ poolId, userId, existingMemberId }: JoinButtonProps) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleJoin() {
    setState('loading')
    const supabase = createClient()

    let error
    if (existingMemberId) {
      // Re-apply: update the rejected row back to pending
      ;({ error } = await supabase
        .from('pool_members')
        .update({ status: 'pending' })
        .eq('id', existingMemberId)
        .eq('user_id', userId))
    } else {
      // New join request
      ;({ error } = await supabase
        .from('pool_members')
        .insert({ pool_id: poolId, user_id: userId, status: 'pending' }))
    }

    if (error) {
      setErrorMsg(error.message)
      setState('error')
      return
    }

    setState('success')
    setTimeout(() => router.push(`/pools/${poolId}`), 1200)
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
          ? 'Sending request…'
          : existingMemberId
          ? 'Re-apply to Join'
          : 'Request to Join'}
      </button>
    </div>
  )
}
