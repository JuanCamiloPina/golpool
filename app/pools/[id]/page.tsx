import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import PoolInfoApproved from './PoolInfoApproved'

export default async function PoolPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: pool } = await supabase
    .from('pools')
    .select('id, name, description, owner_id, invite_code, has_prize, prize_type, entry_fee, prize_1st_fixed, prize_2nd_fixed, prize_3rd_fixed, prize_1st_pct, prize_2nd_pct, prize_3rd_pct, prize_currency')
    .eq('id', id)
    .eq('is_archived', false)
    .single()

  if (!pool) notFound()

  const isAdmin = pool.owner_id === user.id

  // Check membership status
  const { data: membership } = await supabase
    .from('pool_members')
    .select('status')
    .eq('pool_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  // Non-members (who aren't the owner) go to the join flow
  if (!membership && !isAdmin) {
    redirect(`/join/${pool.invite_code}`)
  }

  if (!isAdmin && membership?.status === 'pending') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Back to dashboard
        </Link>
        <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-8 text-center">
          <span className="text-4xl">⏳</span>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{pool.name}</h1>
          <p className="mt-2 text-sm text-amber-700">
            Your membership request is pending. The pool admin will review it shortly.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-sm font-medium text-green-700 underline underline-offset-2"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!isAdmin && membership?.status === 'rejected') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Back to dashboard
        </Link>
        <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
          <span className="text-4xl">🚫</span>
          <h1 className="mt-4 text-xl font-bold text-gray-900">{pool.name}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Your membership request was not approved.
          </p>
          <Link
            href={`/join/${pool.invite_code}`}
            className="mt-6 inline-block text-sm font-medium text-green-700 underline underline-offset-2"
          >
            Re-apply to join
          </Link>
        </div>
      </div>
    )
  }

  // ── Approved member — fetch owner profile via admin client ──────────
  // (member list is fetched client-side by PoolInfoApproved via API route)
  const admin = createAdminClient()

  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', pool.owner_id)
    .single()

  return (
    <PoolInfoApproved
      poolId={id}
      poolName={pool.name}
      poolDescription={pool.description}
      inviteCode={pool.invite_code}
      ownerName={ownerProfile?.full_name ?? '—'}
      isAdmin={isAdmin}
      hasPrize={pool.has_prize ?? false}
      prizeType={pool.prize_type ?? null}
      entryFee={pool.entry_fee ?? null}
      prize1stFixed={pool.prize_1st_fixed ?? null}
      prize2ndFixed={pool.prize_2nd_fixed ?? null}
      prize3rdFixed={pool.prize_3rd_fixed ?? null}
      prize1stPct={pool.prize_1st_pct ?? null}
      prize2ndPct={pool.prize_2nd_pct ?? null}
      prize3rdPct={pool.prize_3rd_pct ?? null}
      prizeCurrency={pool.prize_currency ?? 'USD'}
    />
  )
}
