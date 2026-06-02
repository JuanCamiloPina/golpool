import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: logs, error } = await admin
    .from('audit_log')
    .select('id, user_id, pool_id, action, table_name, payload, old_data, new_data, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!logs || logs.length === 0) return NextResponse.json({ logs: [] })

  const poolIds = [...new Set(logs.map((l) => l.pool_id).filter(Boolean))] as string[]
  const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[]

  const [{ data: pools }, { data: profiles }] = await Promise.all([
    poolIds.length > 0
      ? admin.from('pools').select('id, name').in('id', poolIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? admin.from('profiles').select('id, full_name, email').in('id', userIds)
      : Promise.resolve({ data: [] }),
  ])

  const poolMap = Object.fromEntries((pools ?? []).map((p) => [p.id, p.name]))
  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }])
  )

  const merged = logs.map((l) => ({
    ...l,
    pool_name:   l.pool_id  ? (poolMap[l.pool_id]  ?? null) : null,
    user_name:   l.user_id  ? (profileMap[l.user_id]?.full_name ?? null) : null,
    user_email:  l.user_id  ? (profileMap[l.user_id]?.email     ?? null) : null,
  }))

  return NextResponse.json({ logs: merged })
}
