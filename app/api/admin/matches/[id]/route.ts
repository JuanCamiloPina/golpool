import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

function isAdmin(email: string | undefined): boolean {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase())
  return list.includes(email.toLowerCase())
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/admin/matches/[id]'>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params
  const body = await request.json()
  const { home_score, away_score, status } = body as {
    home_score?: number | null
    away_score?: number | null
    status?: string
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (home_score !== undefined) update.home_score = home_score
  if (away_score !== undefined) update.away_score = away_score
  if (status !== undefined)     update.status     = status

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('matches')
    .update(update)
    .eq('id', id)
    .select('id, home_team, away_team, home_score, away_score, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
