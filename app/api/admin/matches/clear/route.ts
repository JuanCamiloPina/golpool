import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('matches')
    .update({ home_score: null, away_score: null, status: 'scheduled' })
    .in('status', ['scheduled', 'live', 'finished', 'cancelled'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await admin.from('audit_log').insert({
    user_id:    user.id,
    action:     'clear_all_results',
    table_name: 'matches',
    new_data:   { cleared_by: user.email },
  })

  return NextResponse.json({ ok: true })
}
