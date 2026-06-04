import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const name = (body.name ?? '').trim()
  const description = (body.description ?? '').trim() || null

  if (!name) {
    return NextResponse.json({ error: 'Pool name is required' }, { status: 400 })
  }

  const hasPrize = !!body.has_prize
  const prizeType = hasPrize ? (body.prize_type ?? null) : null

  const { data: pool, error } = await supabase
    .from('pools')
    .insert({
      name,
      description,
      owner_id: user.id,
      auto_approve: !!body.auto_approve,
      prize_currency: body.prize_currency ?? 'USD',
      has_prize: hasPrize,
      prize_type: prizeType,
      entry_fee: prizeType === 'per_entry' ? (body.entry_fee ?? null) : null,
      prize_1st_fixed: prizeType === 'fixed' ? (body.prize_1st_fixed ?? null) : null,
      prize_2nd_fixed: prizeType === 'fixed' ? (body.prize_2nd_fixed ?? null) : null,
      prize_3rd_fixed: prizeType === 'fixed' ? (body.prize_3rd_fixed ?? null) : null,
      prize_1st_pct: prizeType === 'per_entry' ? (body.prize_1st_pct ?? null) : null,
      prize_2nd_pct: prizeType === 'per_entry' ? (body.prize_2nd_pct ?? null) : null,
      prize_3rd_pct: prizeType === 'per_entry' ? (body.prize_3rd_pct ?? null) : null,
    })
    .select('id, invite_code')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Auto-enrol the owner as an approved member so they can submit
  // predictions and appear in the leaderboard. The INSERT policy only
  // allows status='pending', so we use the admin client to bypass RLS.
  const admin = createAdminClient()
  await admin
    .from('pool_members')
    .insert({ pool_id: pool.id, user_id: user.id, status: 'approved' })

  return NextResponse.json(pool, { status: 201 })
}
