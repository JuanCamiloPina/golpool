'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type State = 'idle' | 'success' | 'invalid' | 'already_pending'

export default function JoinPoolPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [state, setState] = useState<State>('idle')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('idle')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const normalized = code.trim().toUpperCase()

    const { data: pool } = await supabase
      .from('pools')
      .select('id, auto_approve')
      .eq('invite_code', normalized)
      .eq('is_archived', false)
      .single()

    if (!pool) {
      setState('invalid')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('pool_members')
      .select('id, status')
      .eq('pool_id', pool.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'approved') {
        router.push(`/pools/${pool.id}`)
        return
      }

      if (existing.status === 'pending') {
        setState('already_pending')
        setLoading(false)
        return
      }
    }

    // New join or re-apply after rejection — route through API to handle auto_approve
    const existingMemberId = existing?.status === 'rejected' ? existing.id : undefined

    const res = await fetch(`/api/pools/${pool.id}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ existing_member_id: existingMemberId }),
    })

    if (!res.ok) {
      setState('invalid')
      setLoading(false)
      return
    }

    const data = await res.json()

    if (data.status === 'approved') {
      router.push(`/pools/${pool.id}`)
      return
    }

    setState('success')
    setLoading(false)
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Back to dashboard
            </Link>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Join a Pool</h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter the invite code you received from the pool admin.
            </p>
          </div>

          {state === 'success' && (
            <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-800">
              <p className="font-semibold">Request sent!</p>
              <p className="mt-1">The pool admin needs to approve you before you can participate.</p>
              <Link
                href="/dashboard"
                className="mt-3 inline-block font-medium text-green-700 underline underline-offset-2"
              >
                Back to dashboard
              </Link>
            </div>
          )}

          {state === 'invalid' && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              Invalid invite code. Check that you typed it correctly.
            </div>
          )}

          {state === 'already_pending' && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              You already have a pending request for this pool. The admin hasn&apos;t approved you yet.
            </div>
          )}

          {state !== 'success' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Invite code
                </label>
                <input
                  id="code"
                  type="text"
                  required
                  maxLength={20}
                  placeholder="e.g. A1B2C3D4"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 uppercase tracking-widest focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Looking up…' : 'Join Pool'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
