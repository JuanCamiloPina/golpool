'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'
import { createClient } from '@/lib/supabase'

interface Member {
  userId: string
  fullName: string
}

interface Props {
  poolId: string
  poolName: string
  poolDescription: string | null
  inviteCode: string
  ownerName: string
  isAdmin?: boolean
  hasPrize: boolean
  prizeType: string | null
  entryFee: number | null
  prize1stFixed: number | null
  prize2ndFixed: number | null
  prize3rdFixed: number | null
  prize1stPct: number | null
  prize2ndPct: number | null
  prize3rdPct: number | null
  prizeCurrency: string
}

type CompletionStatus = 'complete' | 'missing' | 'open' | 'pending'

interface RoundMeta { key: string; label: string; deadline: string | null }
interface MemberCompletion {
  userId: string
  fullName: string
  rounds: Record<string, CompletionStatus>
}
interface CompletionData {
  members: MemberCompletion[]
  rounds: RoundMeta[]
}

const STATUS_ICON: Record<CompletionStatus, string> = {
  complete: '✅',
  missing:  '❌',
  open:     '🔓',
  pending:  '⏳',
}

function StatusCell({ status, title }: { status: CompletionStatus; title: string }) {
  return (
    <span title={title} className="text-base leading-none">
      {STATUS_ICON[status]}
    </span>
  )
}

// ── Example data (numbers are fixed; labels come from i18n) ──────────────
interface ExRow { labelKey: string; ok: boolean; groupPts: number; koPts: number }
interface ExData { titleKey: string; rows: ExRow[]; groupTotal: number; koTotal: number }

const EXAMPLES: ExData[] = [
  {
    titleKey: 'ex1Title',
    rows: [
      { labelKey: 'ex1r1', ok: true,  groupPts: 5,  koPts: 10 },
      { labelKey: 'ex1r2', ok: false, groupPts: 0,  koPts: 0  },
      { labelKey: 'ex1r3', ok: false, groupPts: 0,  koPts: 0  },
      { labelKey: 'ex1r4', ok: true,  groupPts: 1,  koPts: 2  },
    ],
    groupTotal: 6,
    koTotal: 12,
  },
  {
    titleKey: 'ex2Title',
    rows: [
      { labelKey: 'ex2r1', ok: true,  groupPts: 5,  koPts: 10 },
      { labelKey: 'ex2r2', ok: false, groupPts: 0,  koPts: 0  },
      { labelKey: 'ex2r3', ok: false, groupPts: 0,  koPts: 0  },
      { labelKey: 'ex2r4', ok: true,  groupPts: 1,  koPts: 2  },
    ],
    groupTotal: 6,
    koTotal: 12,
  },
  {
    titleKey: 'ex3Title',
    rows: [
      { labelKey: 'ex3r1', ok: true,  groupPts: 5,  koPts: 10 },
      { labelKey: 'ex3r2', ok: true,  groupPts: 2,  koPts: 4  },
      { labelKey: 'ex3r3', ok: true,  groupPts: 2,  koPts: 4  },
      { labelKey: 'ex3r4', ok: true,  groupPts: 1,  koPts: 2  },
    ],
    groupTotal: 10,
    koTotal: 20,
  },
]

function PerEntryPrizes({
  poolId, entryFee, prize1stPct, prize2ndPct, prize3rdPct, prizeCurrency, labels,
}: {
  poolId: string
  entryFee: number | null
  prize1stPct: number | null
  prize2ndPct: number | null
  prize3rdPct: number | null
  prizeCurrency: string
  labels: { first: string; second: string; third: string; pot: string; perPerson: string }
}) {
  const [memberCount, setMemberCount] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/pools/${poolId}/members/list`)
      .then((r) => r.ok ? r.json() : { members: [] })
      .then((d) => setMemberCount((d.members ?? []).length))
  }, [poolId])

  const count = memberCount ?? 0
  const pot = (entryFee ?? 0) * count

  function prizeAmt(pct: number | null) {
    return pct != null ? (pot * pct) / 100 : 0
  }

  const rows = [
    { icon: '🥇', label: labels.first, pct: prize1stPct },
    { icon: '🥈', label: labels.second, pct: prize2ndPct },
    { icon: '🥉', label: labels.third, pct: prize3rdPct },
  ].filter((r) => r.pct != null && r.pct > 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{labels.perPerson}</span>
        <span className="font-semibold text-gray-700">{fmt(entryFee ?? 0, prizeCurrency)}</span>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{labels.pot} ({count} {count === 1 ? 'member' : 'members'})</span>
        <span className="font-semibold text-gray-700">{fmt(pot, prizeCurrency)}</span>
      </div>
      <div className="border-t border-gray-100 pt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-xl">{r.icon}</span>
              {r.label} <span className="text-gray-400">({r.pct}%)</span>
            </span>
            <span className="text-base font-bold text-green-700">{fmt(prizeAmt(r.pct), prizeCurrency)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
        <span className="text-lg">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  )
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', MXN: '$', COP: '$', ARS: '$', GBP: '£',
}

function fmt(amount: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] ?? '$'
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PoolInfoApproved({
  poolId, poolName, poolDescription, inviteCode, ownerName,
  isAdmin = false,
  hasPrize, prizeType, entryFee,
  prize1stFixed, prize2ndFixed, prize3rdFixed,
  prize1stPct, prize2ndPct, prize3rdPct,
  prizeCurrency,
}: Props) {
  const { t } = useLang()
  const pi = t.poolInfo

  const [members, setMembers]           = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [completion, setCompletion]     = useState<CompletionData | null>(null)
  const [completionLoading, setCompletionLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/pools/${poolId}/members/list`)
      .then((r) => r.ok ? r.json() : { members: [] })
      .then((data) => setMembers(data.members ?? []))
      .finally(() => setMembersLoading(false))
  }, [poolId])

  useEffect(() => {
    async function loadCompletion() {
      const { data: { user } } = await createClient().auth.getUser()
      if (user) setCurrentUserId(user.id)
      try {
        const res = await fetch(`/api/pools/${poolId}/completion`)
        if (res.ok) setCompletion(await res.json())
      } finally {
        setCompletionLoading(false)
      }
    }
    loadCompletion()
  }, [poolId])

  const tabs = [
    { label: t.tabs.predict,   href: `/pools/${poolId}/predict`     },
    { label: t.tabs.bonus,     href: `/pools/${poolId}/bonus`       },
    { label: t.tabs.standings, href: `/pools/${poolId}/leaderboard` },
    { label: t.tabs.poolInfo,  href: `/pools/${poolId}`             },
  ]

  const bonusRows = [
    { label: pi.bonusWinner,      pts: 40 },
    { label: pi.bonusRunnerUp,    pts: 20 },
    { label: pi.bonusThird,       pts: 10 },
    { label: pi.bonusGoldenBall,  pts: 10 },
    { label: pi.bonusGoldenBoot,  pts: 10 },
    { label: pi.bonusGoldenGlove, pts: 10 },
  ]
  const bonusTotal = bonusRows.reduce((s, r) => s + r.pts, 0)

  const tiebreakers = [pi.tb1, pi.tb2, pi.tb3, pi.tb4, pi.tb5]

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">

      <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
        {pi.back}
      </Link>

      <div className="mt-4 mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{poolName}</h1>
        <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
          {pi.memberBadge}
        </span>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 border-b border-gray-100 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              tab.href === `/pools/${poolId}`
                ? 'border-green-500 text-green-700'
                : 'border-transparent text-gray-500 hover:text-green-700 hover:border-green-400'
            }`}
          >
            {tab.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href={`/pools/${poolId}/admin`}
            className="shrink-0 ml-auto px-4 py-2 text-sm font-medium border-b-2 border-transparent text-green-700 hover:text-green-800 hover:border-green-500 transition-colors"
          >
            {t.tabs.manage}
          </Link>
        )}
      </div>

      {poolDescription && <p className="mb-5 text-sm text-gray-500">{poolDescription}</p>}

      <div className="space-y-5">

        {/* Quick actions */}
        <div className="flex gap-3 flex-wrap">
          <Link href={`/pools/${poolId}/predict`}
            className="inline-flex items-center rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
            {pi.predict}
          </Link>
          <Link href={`/pools/${poolId}/bonus`}
            className="inline-flex items-center rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:border-green-400 hover:text-green-700 transition-colors">
            {pi.bonus}
          </Link>
          <Link href={`/pools/${poolId}/leaderboard`}
            className="inline-flex items-center rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:border-green-400 hover:text-green-700 transition-colors">
            {pi.standings}
          </Link>
        </div>

        {/* Pool details */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900">{pi.infoTitle}</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="text-gray-400">{pi.organizer} </span>
              <span className="font-medium text-gray-800">{ownerName}</span>
            </p>
            <p>
              <span className="text-gray-400">{pi.inviteCode} </span>
              <span className="font-mono font-bold text-green-700">{inviteCode}</span>
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {pi.members}{!membersLoading && ` (${members.length})`}
            </h3>
            {membersLoading ? (
              <div className="space-y-1.5 animate-pulse">
                {[1, 2, 3].map((i) => <div key={i} className="h-4 bg-gray-100 rounded w-32" />)}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-gray-400">{pi.noMembers}</p>
            ) : (
              <ul className="space-y-1">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    {m.fullName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────── COMPLETION ── */}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-0.5">{pi.completionTitle}</h2>
          <p className="text-xs text-gray-400 mb-4">{pi.completionSubtitle}</p>

          {completionLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-7 bg-gray-100 rounded" />)}
            </div>
          ) : !completion || completion.members.length === 0 ? (
            <p className="text-sm text-gray-400">{pi.noMembers}</p>
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 pl-5 pr-3 text-left font-medium text-gray-500 whitespace-nowrap">
                      {pi.members}
                    </th>
                    {completion.rounds.map((r) => (
                      <th key={r.key} className="py-2 px-2 text-center font-medium text-gray-500 whitespace-nowrap min-w-[44px]">
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {completion.members.map((m) => {
                    const isMe = m.userId === currentUserId
                    return (
                      <tr key={m.userId} className={isMe ? 'bg-green-50' : 'hover:bg-gray-50 transition-colors'}>
                        <td className={`py-2 pl-5 pr-3 font-medium whitespace-nowrap text-xs ${isMe ? 'text-green-800' : 'text-gray-700'}`}>
                          {m.fullName}
                          {isMe && <span className="ml-1 text-green-500">✦</span>}
                        </td>
                        {completion.rounds.map((r) => {
                          const s = (m.rounds[r.key] ?? 'pending') as CompletionStatus
                          const titleMap: Record<CompletionStatus, string> = {
                            complete: pi.statusComplete,
                            missing:  pi.statusMissing,
                            open:     pi.statusOpen,
                            pending:  pi.statusPending,
                          }
                          return (
                            <td key={r.key} className="py-2 px-2 text-center">
                              <StatusCell status={s} title={titleMap[s]} />
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 pt-3 pb-1 text-xs text-gray-400">
                {([
                  ['complete', pi.statusComplete],
                  ['missing',  pi.statusMissing],
                  ['open',     pi.statusOpen],
                  ['pending',  pi.statusPending],
                ] as [CompletionStatus, string][]).map(([s, label]) => (
                  <span key={s} className="flex items-center gap-1">
                    {STATUS_ICON[s]} {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────── PRIZES ── */}

        {hasPrize && prizeType === 'fixed' && (
          <SectionCard icon="🏆" title={pi.prizeSectionTitle}>
            <div className="space-y-3">
              {[
                { icon: '🥇', label: pi.first, amount: prize1stFixed },
                { icon: '🥈', label: pi.second, amount: prize2ndFixed },
                { icon: '🥉', label: pi.third, amount: prize3rdFixed },
              ]
                .filter((r) => r.amount != null && r.amount > 0)
                .map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-xl">{r.icon}</span>
                      {r.label}
                    </span>
                    <span className="text-base font-bold text-green-700">
                      {fmt(r.amount!, prizeCurrency)}
                    </span>
                  </div>
                ))}
            </div>
          </SectionCard>
        )}

        {hasPrize && prizeType === 'per_entry' && (
          <SectionCard icon="🏆" title={pi.prizeSectionTitle}>
            {prize1stPct === 100 && (
              <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-center text-sm font-bold text-amber-800">
                🏆 {pi.winnerTakesAll}
              </div>
            )}
            <PerEntryPrizes
              poolId={poolId}
              entryFee={entryFee}
              prize1stPct={prize1stPct}
              prize2ndPct={prize2ndPct}
              prize3rdPct={prize3rdPct}
              prizeCurrency={prizeCurrency}
              labels={{ first: pi.first, second: pi.second, third: pi.third, pot: pi.pot, perPerson: pi.perPerson }}
            />
          </SectionCard>
        )}

        {/* ─────────────────────────────────────────────── RULES ── */}

        {/* Section 1 — How it works */}
        <SectionCard icon="📋" title={pi.sec1Title}>
          <ul className="space-y-2 text-sm text-gray-600">
            {[pi.sec1b1, pi.sec1b2, pi.sec1b3].map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-green-500 mt-0.5 shrink-0">•</span>
                {b}
              </li>
            ))}
            <li className="flex gap-2 mt-1 rounded-xl bg-green-50 border border-green-100 px-3 py-2 text-green-800 text-xs">
              <span className="shrink-0">💡</span>
              {pi.sec1b4}
            </li>
          </ul>
        </SectionCard>

        {/* Section 2 — Points system */}
        <SectionCard icon="📊" title={pi.sec2Title}>
          <div className="space-y-4">
            {/* Group stage */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{pi.groupLabel}</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: pi.correctResult, pts: 5  },
                    { label: pi.correctHome,   pts: 2  },
                    { label: pi.correctAway,   pts: 2  },
                    { label: pi.correctDiff,   pts: 1  },
                    { label: pi.maxPerMatch,   pts: 10, bold: true },
                  ].map(({ label, pts, bold }) => (
                    <tr key={label} className={bold ? 'border-t border-gray-200' : ''}>
                      <td className={`py-1.5 text-gray-600 ${bold ? 'font-semibold text-gray-700' : ''}`}>{label}</td>
                      <td className={`py-1.5 text-right tabular-nums ${bold ? 'font-bold text-green-700' : 'font-semibold text-gray-700'}`}>{pts} {pi.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Knockout */}
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">{pi.knockoutLabel}</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: pi.correctResult, pts: 10 },
                    { label: pi.correctHome,   pts: 4  },
                    { label: pi.correctAway,   pts: 4  },
                    { label: pi.correctDiff,   pts: 2  },
                    { label: pi.maxPerMatch,   pts: 20, bold: true },
                  ].map(({ label, pts, bold }) => (
                    <tr key={label} className={bold ? 'border-t border-gray-200' : ''}>
                      <td className={`py-1.5 text-gray-600 ${bold ? 'font-semibold text-gray-700' : ''}`}>{label}</td>
                      <td className={`py-1.5 text-right tabular-nums ${bold ? 'font-bold text-green-700' : 'font-semibold text-green-700'}`}>{pts} {pi.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>

        {/* Section 3 — Examples */}
        <SectionCard icon="💡" title={pi.sec3Title}>
          <div className="space-y-4">
            {EXAMPLES.map((ex) => {
              const piAny = pi as Record<string, string>
              return (
                <div key={ex.titleKey} className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
                  <div className="bg-gray-100 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-700">{piAny[ex.titleKey]}</p>
                  </div>
                  <div className="px-3 py-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="py-1 text-left text-gray-400 font-medium" />
                          <th className="py-1 text-right text-gray-500 font-medium pr-3">{pi.groupCol}</th>
                          <th className="py-1 text-right text-green-600 font-medium">{pi.knockoutCol}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ex.rows.map((row) => (
                          <tr key={row.labelKey}>
                            <td className="py-1.5 text-gray-600 pr-2">
                              <span className={`mr-1 font-bold ${row.ok ? 'text-green-600' : 'text-red-400'}`}>
                                {row.ok ? '✓' : '✗'}
                              </span>
                              {piAny[row.labelKey]}
                            </td>
                            <td className={`py-1.5 text-right tabular-nums pr-3 font-semibold ${row.ok ? 'text-gray-700' : 'text-gray-300'}`}>
                              {row.ok ? `+${row.groupPts}` : '0'}
                            </td>
                            <td className={`py-1.5 text-right tabular-nums font-semibold ${row.ok ? 'text-green-700' : 'text-gray-300'}`}>
                              {row.ok ? `+${row.koPts}` : '0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300">
                          <td className="py-1.5 text-xs font-bold text-gray-700">{/* spacer */}</td>
                          <td className="py-1.5 text-right tabular-nums text-xs font-bold text-gray-800 pr-3">
                            {ex.groupTotal} {pi.pts}
                            <div className="text-gray-400 font-normal">{pi.exGroupTotal}</div>
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-xs font-bold text-green-700">
                            {ex.koTotal} {pi.pts}
                            <div className="text-green-400 font-normal">{pi.exKnockoutTotal}</div>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* Section 4 — Bonus */}
        <SectionCard icon="⭐" title={pi.sec4Title}>
          <table className="w-full text-sm mb-3">
            <tbody className="divide-y divide-gray-50">
              {bonusRows.map(({ label, pts }) => (
                <tr key={label}>
                  <td className="py-1.5 text-gray-600">{label}</td>
                  <td className="py-1.5 text-right font-semibold text-green-700 tabular-nums">{pts} {pi.pts}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200">
                <td className="py-2 font-bold text-gray-700">{pi.bonusTotalPossible}</td>
                <td className="py-2 text-right font-bold text-green-700 tabular-nums">{bonusTotal} {pi.pts}</td>
              </tr>
            </tbody>
          </table>
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            {pi.bonusDeadline}
          </div>
        </SectionCard>

        {/* Section 5 — Deadlines */}
        <SectionCard icon="⏰" title={pi.sec5Title}>
          <ul className="space-y-2 text-sm text-gray-600">
            {[pi.sec5b1, pi.sec5b2, pi.sec5b3].map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-green-500 mt-0.5 shrink-0">•</span>
                <span dangerouslySetInnerHTML={{ __html: b.replace('LOCKED', '<strong>LOCKED</strong>').replace('BLOQUEADAS', '<strong>BLOQUEADAS</strong>') }} />
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Section 6 — Tiebreakers */}
        <SectionCard icon="⚖️" title={pi.sec6Title}>
          <p className="text-sm text-gray-500 mb-3">{pi.sec6intro}</p>
          <ol className="space-y-2">
            {tiebreakers.map((tb, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {tb.replace(/^\d+\.\s*/, '')}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-gray-400 italic">{pi.sec6end}</p>
        </SectionCard>

      </div>
    </div>
  )
}
