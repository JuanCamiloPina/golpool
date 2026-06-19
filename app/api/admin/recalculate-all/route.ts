import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('recalculate_all_points')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type RpcRow = { predictions_updated: number; members_updated: number }
  const row = (data as RpcRow[] | null)?.[0]

  return NextResponse.json({
    predictionsUpdated: row?.predictions_updated ?? 0,
    membersUpdated:     row?.members_updated     ?? 0,
  })
}
