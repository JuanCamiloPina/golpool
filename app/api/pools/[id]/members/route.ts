import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/pools/[id]/members'>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: poolId } = await ctx.params
  const body = await request.json()
  const { memberId, action } = body as { memberId: string; action: 'approve' | 'reject' | 'restore' }

  console.log('[PATCH members] poolId:', poolId, 'memberId:', memberId, 'action:', action, 'userId:', user.id)

  if (!memberId || !['approve', 'reject', 'restore'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Verify caller is the pool owner
  const { data: pool, error: poolError } = await supabase
    .from('pools')
    .select('owner_id')
    .eq('id', poolId)
    .single()

  console.log('[PATCH members] pool:', pool, 'poolError:', poolError)

  if (!pool || pool.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const status = action === 'approve' ? 'approved' : action === 'restore' ? 'pending' : 'rejected'

  const { data: updated, error: updateError } = await supabase
    .from('pool_members')
    .update({ status })
    .eq('id', memberId)
    .eq('pool_id', poolId)
    .select('id, status')

  console.log('[PATCH members] updated:', updated, 'updateError:', updateError)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status })
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/pools/[id]/members'>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: poolId } = await ctx.params
  const { memberId, userId: targetUserId } =
    (await request.json()) as { memberId: string; userId: string }

  if (!memberId || !targetUserId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Verify caller is the pool owner
  const { data: pool } = await supabase
    .from('pools')
    .select('owner_id')
    .eq('id', poolId)
    .single()

  if (!pool || pool.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete the member's predictions, then mark membership as 'removed'
  // (keep the row so the join API can block auto-rejoin in open pools).
  // Admin client bypasses RLS for prediction tables and the status update.
  const admin = createAdminClient()

  await Promise.all([
    admin.from('predictions').delete()
      .eq('pool_id', poolId).eq('user_id', targetUserId),
    admin.from('bonus_predictions').delete()
      .eq('pool_id', poolId).eq('user_id', targetUserId),
  ])

  const { error } = await admin
    .from('pool_members')
    .update({ status: 'removed' })
    .eq('id', memberId)
    .eq('pool_id', poolId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
