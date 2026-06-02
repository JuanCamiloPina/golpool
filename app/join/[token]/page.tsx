import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import JoinButton from './JoinButton'

export default async function PublicJoinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  // Look up pool by invite_code (archived pools are not joinable)
  const { data: pool } = await supabase
    .from('pools')
    .select('id, name, description')
    .eq('invite_code', token.toUpperCase())
    .eq('is_archived', false)
    .single()

  if (!pool) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in — prompt to sign up or log in
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <span className="text-5xl">⚽</span>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{pool.name}</h1>
            {pool.description && (
              <p className="mt-2 text-sm text-gray-500">{pool.description}</p>
            )}
            <p className="mt-4 text-sm text-gray-600">
              You&apos;ve been invited to this World Cup 2026 prediction pool.
              Sign up or log in to request access.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={`/auth/signup?next=/join/${token}`}
                className="w-full rounded-full bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors text-center"
              >
                Sign Up to Join
              </Link>
              <Link
                href={`/auth/login?next=/join/${token}`}
                className="w-full rounded-full border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:border-green-400 transition-colors text-center"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Check existing membership
  const { data: existing } = await supabase
    .from('pool_members')
    .select('id, status')
    .eq('pool_id', pool.id)
    .eq('user_id', user.id)
    .maybeSingle()

  // Already an approved member
  if (existing?.status === 'approved') {
    redirect(`/pools/${pool.id}`)
  }

  // Already pending
  if (existing?.status === 'pending') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <span className="text-5xl">⏳</span>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{pool.name}</h1>
            <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              Your join request is pending. The pool admin will approve you shortly.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block text-sm font-medium text-green-700 underline underline-offset-2"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Previously rejected — show re-apply UI
  if (existing?.status === 'rejected') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-6">
              <span className="text-5xl">⚽</span>
              <h1 className="mt-4 text-2xl font-bold text-gray-900">{pool.name}</h1>
              {pool.description && (
                <p className="mt-2 text-sm text-gray-500">{pool.description}</p>
              )}
              <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                Your previous request was not approved. You can submit a new request below.
              </p>
            </div>
            <JoinButton poolId={pool.id} userId={user.id} existingMemberId={existing.id} />
            <div className="mt-4 text-center">
              <Link
                href="/dashboard"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Logged in and not a member — show join button
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-6">
            <span className="text-5xl">⚽</span>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{pool.name}</h1>
            {pool.description && (
              <p className="mt-2 text-sm text-gray-500">{pool.description}</p>
            )}
            <p className="mt-4 text-sm text-gray-600">
              You&apos;ve been invited to this prediction pool.
              Your request will need admin approval before you can participate.
            </p>
          </div>
          <JoinButton poolId={pool.id} userId={user.id} />
          <div className="mt-4 text-center">
            <Link
              href="/dashboard"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
