import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // ── Owned pools ──────────────────────────────────────────────────────
  const { data: ownedRaw } = await supabase
    .from('pools')
    .select('id, name, description, invite_code, created_at')
    .eq('owner_id', user.id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  const ownedIds = new Set((ownedRaw ?? []).map((p) => p.id))
  let ownedPools: unknown[] = []

  if (ownedRaw && ownedRaw.length > 0) {
    const poolIds = ownedRaw.map((p) => p.id)

    // Admin client bypasses RLS so we see all members, not just our own row
    const [{ data: memberRows }, { data: adminMemberships }] = await Promise.all([
      admin.from('pool_members').select('pool_id, status, total_points').in('pool_id', poolIds),
      admin.from('pool_members').select('pool_id, total_points').eq('user_id', user.id).in('pool_id', poolIds),
    ])

    const memberCounts: Record<string, { approved: number; pending: number }> = {}
    const ownedMemberPoints: Record<string, number[]> = {}
    const adminPointsMap: Record<string, number> = {}

    for (const row of memberRows ?? []) {
      if (!memberCounts[row.pool_id]) memberCounts[row.pool_id] = { approved: 0, pending: 0 }
      if (row.status === 'approved') {
        memberCounts[row.pool_id].approved++
        if (!ownedMemberPoints[row.pool_id]) ownedMemberPoints[row.pool_id] = []
        ownedMemberPoints[row.pool_id].push(row.total_points ?? 0)
      }
      if (row.status === 'pending') memberCounts[row.pool_id].pending++
    }
    for (const m of adminMemberships ?? []) {
      adminPointsMap[m.pool_id] = m.total_points
    }

    ownedPools = ownedRaw.map((p) => {
      const myPts = adminPointsMap[p.id] ?? null
      let myRank: number | null = null
      if (myPts !== null && ownedMemberPoints[p.id]) {
        const above = ownedMemberPoints[p.id].filter((pts) => pts > myPts).length
        myRank = above + 1
      }
      return {
        id: p.id, name: p.name, description: p.description, invite_code: p.invite_code,
        approvedCount: memberCounts[p.id]?.approved ?? 0,
        pendingCount:  memberCounts[p.id]?.pending  ?? 0,
        myPoints: myPts,
        myRank,
      }
    })
  }

  // ── Joined pools (not owner) ─────────────────────────────────────────
  const { data: memberships } = await supabase
    .from('pool_members')
    .select('pool_id, status, total_points')
    .eq('user_id', user.id)

  const nonOwned = (memberships ?? []).filter(
    (m) => !ownedIds.has(m.pool_id) && m.status !== 'removed'
  )

  let joinedPools: unknown[] = []

  if (nonOwned.length > 0) {
    const joinedPoolIds = nonOwned.map((m) => m.pool_id)

    const [{ data: poolsData }, { data: allMemberPts }] = await Promise.all([
      supabase
        .from('pools')
        .select('id, name, description, invite_code')
        .in('id', joinedPoolIds)
        .eq('is_archived', false),
      // Admin client: RLS would otherwise limit this to only the current user's row,
      // causing rank to be computed as "1 of 1" regardless of pool size.
      admin
        .from('pool_members')
        .select('pool_id, total_points')
        .in('pool_id', joinedPoolIds)
        .eq('status', 'approved'),
    ])

    const ptsByPool: Record<string, number[]> = {}
    for (const row of allMemberPts ?? []) {
      if (!ptsByPool[row.pool_id]) ptsByPool[row.pool_id] = []
      ptsByPool[row.pool_id].push(row.total_points ?? 0)
    }

    joinedPools = (poolsData ?? []).map((p) => {
      const m = nonOwned.find((m) => m.pool_id === p.id)!
      const poolPts = ptsByPool[p.id] ?? []
      const approvedCount = poolPts.length
      let myRank: number | null = null
      if (m.status === 'approved') {
        const above = poolPts.filter((pts) => pts > (m.total_points ?? 0)).length
        myRank = above + 1
      }
      return {
        id: p.id, name: p.name, description: p.description, invite_code: p.invite_code,
        status: m.status, total_points: m.total_points,
        myRank, approvedCount,
      }
    })
  }

  return NextResponse.json({
    firstName: profile?.full_name?.split(' ')[0] ?? user.email ?? '',
    email: user.email ?? '',
    ownedPools,
    joinedPools,
  })
}
