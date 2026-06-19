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
  const { home_score, away_score, status, home_team, away_team } = body as {
    home_score?: number | null
    away_score?: number | null
    status?: string
    home_team?: string
    away_team?: string
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (home_score !== undefined) update.home_score = home_score
  if (away_score !== undefined) update.away_score = away_score
  if (status !== undefined)     update.status     = status
  if (home_team !== undefined)  update.home_team  = home_team
  if (away_team !== undefined)  update.away_team  = away_team

  const TBD_RE = /^(W Match|L Match|W Group|RU Group|Best 3rd)/
  const isResettingToTBD =
    (home_team !== undefined && TBD_RE.test(home_team)) ||
    (away_team !== undefined && TBD_RE.test(away_team))

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('matches')
    .update(update)
    .eq('id', id)
    .select('id, home_team, away_team, home_score, away_score, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // When resetting teams back to TBD, predictions for this match are now invalid
  if (isResettingToTBD) {
    await admin.from('predictions').delete().eq('match_id', id)
  }

  // Auto-recalculate all points after a score save; log but don't block the response
  const { error: rpcError } = await admin.rpc('recalculate_all_points')
  if (rpcError) console.error('[match-patch] recalculate_all_points error:', rpcError)

  return NextResponse.json({ ...data, pointsRecalculated: !rpcError })
}
