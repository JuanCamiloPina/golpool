import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

const BONUS_QUESTIONS = ['winner', 'runner_up', 'third_place', 'golden_ball', 'golden_boot', 'golden_glove']

const ROUND_KEY_MAP: Record<string, string> = {
  'Group Stage – Matchday 1': 'md1',
  'Group Stage – Matchday 2': 'md2',
  'Group Stage – Matchday 3': 'md3',
  'Round of 32':              'r32',
  'Round of 16':              'r16',
  'Quarterfinals':            'qf',
  'Semifinals':               'sf',
  'Final':                    'final',
}

const ROUND_LABEL_MAP: Record<string, string> = {
  md1: 'MD1', md2: 'MD2', md3: 'MD3',
  r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', final: 'Final',
}

function roundKey(name: string): string {
  return ROUND_KEY_MAP[name] ?? name.toLowerCase().replace(/[\s–-]+/g, '_')
}

type CompletionStatus = 'complete' | 'missing' | 'open' | 'pending'

function getStatus(deadline: string | null, hasPredictions: boolean): CompletionStatus {
  if (!deadline) return 'pending'
  if (hasPredictions) return 'complete'
  return new Date(deadline) <= new Date() ? 'missing' : 'open'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: poolId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership } = await supabase
    .from('pool_members')
    .select('status')
    .eq('pool_id', poolId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || membership.status !== 'approved') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Fetch everything in parallel
  const [
    { data: rounds },
    { data: memberRows },
    { data: predRows },
    { data: bonusRows },
    { data: allMatches },
  ] = await Promise.all([
    admin.from('rounds')
      .select('id, name, prediction_deadline')
      .order('order_index', { ascending: true }),
    admin.from('pool_members')
      .select('user_id, profiles(full_name)')
      .eq('pool_id', poolId)
      .eq('status', 'approved'),
    admin.from('predictions')
      .select('user_id, match_id')
      .eq('pool_id', poolId),
    admin.from('bonus_predictions')
      .select('user_id, question')
      .eq('pool_id', poolId),
    admin.from('matches')
      .select('id, round_id'),
  ])

  // match_id → round_id
  const matchRound: Record<string, number> = {}
  for (const m of allMatches ?? []) matchRound[m.id] = m.round_id

  // "userId|roundId" set for members who have ≥1 prediction per round
  const predSet = new Set<string>()
  for (const p of predRows ?? []) {
    const rid = matchRound[p.match_id]
    if (rid) predSet.add(`${p.user_id}|${rid}`)
  }

  // userId → count of answered bonus questions
  const bonusCount: Record<string, number> = {}
  for (const b of bonusRows ?? []) {
    bonusCount[b.user_id] = (bonusCount[b.user_id] ?? 0) + 1
  }

  // MD1 deadline used for bonus
  const md1Round = (rounds ?? []).find((r) => r.name === 'Group Stage – Matchday 1')
  const bonusDeadline = md1Round?.prediction_deadline ?? null

  const roundsMeta = (rounds ?? []).map((r) => ({
    key:      roundKey(r.name),
    label:    ROUND_LABEL_MAP[roundKey(r.name)] ?? r.name,
    deadline: r.prediction_deadline,
  }))

  const members = (memberRows ?? []).map((m) => {
    const uid = m.user_id
    const roundStatuses: Record<string, CompletionStatus> = {}

    for (const r of rounds ?? []) {
      const key = roundKey(r.name)
      roundStatuses[key] = getStatus(r.prediction_deadline, predSet.has(`${uid}|${r.id}`))
    }

    roundStatuses['bonus'] = getStatus(
      bonusDeadline,
      (bonusCount[uid] ?? 0) >= BONUS_QUESTIONS.length
    )

    return {
      userId:   uid,
      fullName: (m as unknown as { profiles: { full_name: string } | null }).profiles?.full_name ?? '—',
      rounds:   roundStatuses,
    }
  })

  return NextResponse.json({
    members,
    rounds: [...roundsMeta, { key: 'bonus', label: 'Bonus', deadline: bonusDeadline }],
  })
}
