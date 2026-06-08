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
  if (hasPredictions) return 'complete'
  if (!deadline) return 'pending'
  return new Date(deadline) <= new Date() ? 'missing' : 'open'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllPredictions(admin: any, poolId: string): Promise<{ user_id: string; match_id: string }[]> {
  const all: { user_id: string; match_id: string }[] = []
  const pageSize = 1000
  let page = 0

  while (true) {
    const { data, error } = await admin
      .from('predictions')
      .select('user_id, match_id')
      .eq('pool_id', poolId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) { console.error('[completion] predictions page error:', error); break }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    page++
  }

  return all
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllBonusPredictions(admin: any, poolId: string): Promise<{ user_id: string; question: string }[]> {
  const all: { user_id: string; question: string }[] = []
  const pageSize = 1000
  let page = 0

  while (true) {
    const { data, error } = await admin
      .from('bonus_predictions')
      .select('user_id, question')
      .eq('pool_id', poolId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) { console.error('[completion] bonus_predictions page error:', error); break }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    page++
  }

  return all
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

  // Fetch bounded queries in parallel, paginated queries sequentially after
  const [
    { data: rounds,     error: roundsErr },
    { data: memberRows, error: membersErr },
    { data: allMatches, error: matchesErr },
  ] = await Promise.all([
    admin.from('rounds')
      .select('id, name, prediction_deadline')
      .order('order_index', { ascending: true }),
    admin.from('pool_members')
      .select('user_id, profiles(full_name)')
      .eq('pool_id', poolId)
      .eq('status', 'approved'),
    admin.from('matches')
      .select('id, round_id')
      .limit(500),
  ])

  if (roundsErr)  console.error('[completion] rounds query error:', roundsErr)
  if (membersErr) console.error('[completion] members query error:', membersErr)
  if (matchesErr) console.error('[completion] matches query error:', matchesErr)

  // Paginated fetches (Supabase server-side cap is 1000 rows per request)
  const [predRows, bonusRows] = await Promise.all([
    fetchAllPredictions(admin, poolId),
    fetchAllBonusPredictions(admin, poolId),
  ])

  console.log(`[completion] pool=${poolId} rounds=${rounds?.length ?? 0} matches=${allMatches?.length ?? 0} predictions=${predRows.length} members=${memberRows?.length ?? 0}`)

  // ── Diagnostics: round IDs ─────────────────────────────────────
  for (const r of rounds ?? []) {
    console.log(`[completion] round id=${r.id} (${typeof r.id}) name="${r.name}" deadline=${r.prediction_deadline}`)
  }

  // ── Build match_id → round_id map ─────────────────────────────
  const matchRound: Record<string, number> = {}
  for (const m of allMatches ?? []) matchRound[m.id] = m.round_id

  // ── Diagnostics: sample MD1 matches (first 3) ─────────────────
  const md1RoundId = (rounds ?? []).find((r) => r.name === 'Group Stage – Matchday 1')?.id
  const md1Matches = (allMatches ?? []).filter((m) => m.round_id === md1RoundId)
  console.log(`[completion] MD1 round_id=${md1RoundId} — ${md1Matches.length} MD1 matches in DB`)

  // ── Diagnostics: sample predictions (first 5) ─────────────────
  for (const p of predRows.slice(0, 5)) {
    const rid = matchRound[p.match_id]
    const key = rid !== undefined ? `${p.user_id}|${rid}` : '(orphaned)'
    console.log(`[completion] pred user=${p.user_id.slice(0, 8)} match_id=${p.match_id} → round_id=${rid} key="${key}"`)
  }

  // ── Build predSet ──────────────────────────────────────────────
  // Key: "userId|roundId" — one entry per user per round (≥1 prediction = complete)
  const predSet = new Set<string>()
  let orphanedCount = 0
  for (const p of predRows) {
    const rid = matchRound[p.match_id]
    if (rid !== undefined && rid !== null) {
      predSet.add(`${p.user_id}|${rid}`)
    } else {
      orphanedCount++
    }
  }

  console.log(`[completion] orphaned=${orphanedCount} validPredKeys=${predSet.size}`)

  // ── userId → count of answered bonus questions ─────────────────
  const bonusCount: Record<string, number> = {}
  for (const b of bonusRows) {
    bonusCount[b.user_id] = (bonusCount[b.user_id] ?? 0) + 1
  }

  // ── MD1 deadline used for bonus ────────────────────────────────
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
      const key       = roundKey(r.name)
      const lookupKey = `${uid}|${r.id}`
      const hasPreds  = predSet.has(lookupKey)
      const status    = getStatus(r.prediction_deadline, hasPreds)

      if (r.name === 'Group Stage – Matchday 1') {
        console.log(`[completion] user=${uid.slice(0, 8)} MD1 lookupKey="${lookupKey}" hasPreds=${hasPreds} status=${status}`)
      }

      roundStatuses[key] = status
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
