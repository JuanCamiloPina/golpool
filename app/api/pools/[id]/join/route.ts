import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const existingMemberId: string | undefined = body.existing_member_id

  const [{ data: pool }, { data: existingRecord }] = await Promise.all([
    supabase
      .from('pools')
      .select('id, auto_approve')
      .eq('id', poolId)
      .eq('is_archived', false)
      .single(),
    supabase
      .from('pool_members')
      .select('id, status')
      .eq('pool_id', poolId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (!pool) {
    return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
  }

  // Only auto-approve users who have NEVER been in this pool before.
  // Anyone with an existing record (rejected, or previously removed and
  // re-added, etc.) must go through manual approval.
  const hasExistingRecord = !!existingRecord
  const status = pool.auto_approve && !hasExistingRecord ? 'approved' : 'pending'
  // RLS only allows inserting status='pending'; use admin client when auto-approving
  const client = status === 'approved' ? createAdminClient() : supabase

  const rowId = existingMemberId ?? existingRecord?.id
  let error
  if (rowId) {
    ;({ error } = await client
      .from('pool_members')
      .update({ status })
      .eq('id', rowId)
      .eq('user_id', user.id))
  } else {
    ;({ error } = await client
      .from('pool_members')
      .insert({ pool_id: poolId, user_id: user.id, status }))
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status })
}
