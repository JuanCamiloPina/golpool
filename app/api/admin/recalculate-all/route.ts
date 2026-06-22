import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

export async function POST(_req: NextRequest) {
  console.time('[recalculate] total')

  console.time('[recalculate] createClient')
  const supabase = await createClient()
  console.timeEnd('[recalculate] createClient')

  console.time('[recalculate] getUser')
  const { data: { user } } = await supabase.auth.getUser()
  console.timeEnd('[recalculate] getUser')

  if (!user || !isAdmin(user.email)) {
    console.timeEnd('[recalculate] total')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  console.time('[recalculate] rpc')
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('recalculate_all_points')
  console.timeEnd('[recalculate] rpc')

  console.timeEnd('[recalculate] total')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type RpcRow = { predictions_updated: number; members_updated: number }
  const row = (data as RpcRow[] | null)?.[0]

  return NextResponse.json({
    predictionsUpdated: row?.predictions_updated ?? 0,
    membersUpdated:     row?.members_updated     ?? 0,
  })
}
