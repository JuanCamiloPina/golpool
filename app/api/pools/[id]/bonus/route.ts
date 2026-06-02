import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params
  const { searchParams } = new URL(req.url)
  const targetUid = searchParams.get('user_id')

  if (!targetUid) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: membership }, { data: pool }] = await Promise.all([
    supabase.from('pool_members').select('status').eq('pool_id', poolId).eq('user_id', user.id).maybeSingle(),
    supabase.from('pools').select('owner_id').eq('id', poolId).single(),
  ])

  const isOwner          = pool?.owner_id === user.id
  const isApprovedMember = membership?.status === 'approved'
  if (!isOwner && !isApprovedMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Other users' bonus picks only visible after MD1 deadline has passed
  if (targetUid !== user.id) {
    const { data: round } = await admin
      .from('rounds')
      .select('prediction_deadline')
      .eq('name', 'Group Stage – Matchday 1')
      .single()

    const dl = round?.prediction_deadline
    if (!dl || new Date(dl) > new Date()) {
      return NextResponse.json({ error: 'Not yet visible' }, { status: 403 })
    }
  }

  const { data: rows, error } = await admin
    .from('bonus_predictions')
    .select('question, answer, points')
    .eq('pool_id', poolId)
    .eq('user_id', targetUid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bonus: rows ?? [] })
}
