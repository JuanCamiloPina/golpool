'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'MXN', symbol: '$', label: 'MXN ($)' },
  { code: 'COP', symbol: '$', label: 'COP ($)' },
  { code: 'ARS', symbol: '$', label: 'ARS ($)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
]

function getCurrencySymbol(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? '$'
}

type PrizeType = 'fixed' | 'per_entry' | null

interface FormState {
  name: string
  description: string
  currency: string
  hasPrize: boolean | null
  prizeType: PrizeType
  entryFee: string
  prize1stFixed: string
  prize2ndFixed: string
  prize3rdFixed: string
  prize1stPct: string
  prize2ndPct: string
  prize3rdPct: string
}

// Step 1: basics → Step 2: prize yes/no → Step 3a/3b: prize config → Step 4: review
type Step = 1 | 2 | '3a' | '3b' | 4

function StepIndicator({ step }: { step: Step }) {
  const steps = [1, 2, 3, 4]
  const current = step === '3a' || step === '3b' ? 3 : (step as number)
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                s < current
                  ? 'bg-green-500 text-white'
                  : s === current
                  ? 'bg-green-600 text-white ring-4 ring-green-100'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < current ? '✓' : s}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-1 rounded transition-colors ${
                  s < current ? 'bg-green-400' : 'bg-gray-100'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((current - 1) / 3) * 100}%` }}
        />
      </div>
    </div>
  )
}

function SelectionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 p-5 transition-all ${
        selected
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-white hover:border-green-300'
      }`}
    >
      {children}
    </button>
  )
}

export default function CreatePoolPage() {
  const router = useRouter()
  const { t } = useLang()
  const cp = t.createPool

  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    currency: 'USD',
    hasPrize: null,
    prizeType: null,
    entryFee: '',
    prize1stFixed: '',
    prize2ndFixed: '',
    prize3rdFixed: '',
    prize1stPct: '',
    prize2ndPct: '',
    prize3rdPct: '',
  })

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // ── validation helpers ────────────────────────────────────────────────

  function pctTotal() {
    const a = parseFloat(form.prize1stPct) || 0
    const b = parseFloat(form.prize2ndPct) || 0
    const c = parseFloat(form.prize3rdPct) || 0
    return a + b + c
  }

  function pctError() {
    const total = pctTotal()
    if (!form.prize1stPct) return cp.pctRequired
    if (total !== 100) return cp.pctMustBe100.replace('{n}', String(total))
    return null
  }

  function examplePot(players = 10) {
    const fee = parseFloat(form.entryFee) || 0
    return fee * players
  }

  function examplePrize(pctStr: string, players = 10) {
    const pct = parseFloat(pctStr) || 0
    return (examplePot(players) * pct) / 100
  }

  function fixedTotal() {
    const a = parseFloat(form.prize1stFixed) || 0
    const b = parseFloat(form.prize2ndFixed) || 0
    const c = parseFloat(form.prize3rdFixed) || 0
    return a + b + c
  }

  // ── navigation ───────────────────────────────────────────────────────

  function goNext() {
    setError(null)
    if (step === 1) {
      if (!form.name.trim()) { setError(cp.nameRequired); return }
      setStep(2)
    } else if (step === 2) {
      if (form.hasPrize === null) { setError(cp.prizeChoiceRequired); return }
      if (!form.hasPrize) { setStep(4); return }
      if (!form.prizeType) { setError(cp.prizeTypeRequired); return }
      setStep(form.prizeType === 'fixed' ? '3a' : '3b')
    } else if (step === '3a') {
      if (!form.prize1stFixed) { setError(cp.prize1stRequired); return }
      setStep(4)
    } else if (step === '3b') {
      const err = pctError()
      if (!form.entryFee) { setError(cp.entryFeeRequired); return }
      if (err) { setError(err); return }
      setStep(4)
    }
  }

  function goBack() {
    setError(null)
    if (step === 4) {
      if (!form.hasPrize) { setStep(2); return }
      setStep(form.prizeType === 'fixed' ? '3a' : '3b')
    } else if (step === '3a' || step === '3b') {
      setStep(2)
    } else if (step === 2) {
      setStep(1)
    }
  }

  // ── submit ───────────────────────────────────────────────────────────

  async function handleCreate() {
    setError(null)
    setLoading(true)

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      prize_currency: form.currency,
      has_prize: !!form.hasPrize,
    }

    if (form.hasPrize && form.prizeType) {
      body.prize_type = form.prizeType
      if (form.prizeType === 'fixed') {
        body.prize_1st_fixed = parseFloat(form.prize1stFixed) || null
        body.prize_2nd_fixed = parseFloat(form.prize2ndFixed) || null
        body.prize_3rd_fixed = parseFloat(form.prize3rdFixed) || null
      } else {
        body.entry_fee = parseFloat(form.entryFee) || null
        body.prize_1st_pct = parseFloat(form.prize1stPct) || null
        body.prize_2nd_pct = parseFloat(form.prize2ndPct) || null
        body.prize_3rd_pct = parseFloat(form.prize3rdPct) || null
      }
    }

    const res = await fetch('/api/pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? cp.genericError)
      setLoading(false)
      return
    }

    router.push(`/pools/${data.id}/admin`)
  }

  const sym = getCurrencySymbol(form.currency)

  // ── render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-start justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">

          {/* Header */}
          <div className="mb-6">
            {step === 1 ? (
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← {cp.backDashboard}
              </Link>
            ) : (
              <button
                type="button"
                onClick={goBack}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← {cp.back}
              </button>
            )}
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{cp.title}</h1>
          </div>

          <StepIndicator step={step} />

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Step 1: Pool basics ─────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-4">
                  {cp.step1Label}
                </p>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {cp.nameLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  maxLength={80}
                  placeholder={cp.namePlaceholder}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  {cp.descLabel} <span className="text-gray-400 font-normal">({cp.optional})</span>
                </label>
                <textarea
                  id="description"
                  rows={3}
                  maxLength={300}
                  placeholder={cp.descPlaceholder}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
                />
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                  {cp.currencyLabel}
                </label>
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(e) => set('currency', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={!form.name.trim()}
                className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {cp.next}
              </button>
            </div>
          )}

          {/* ── Step 2: Prize setup ─────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                {cp.step2Label}
              </p>
              <p className="text-base font-semibold text-gray-900">{cp.hasPrizeQuestion}</p>

              <div className="space-y-3">
                <SelectionCard
                  selected={form.hasPrize === true}
                  onClick={() => set('hasPrize', true)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">🏆</span>
                    <div>
                      <p className="font-semibold text-gray-900">{cp.yesPrize}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{cp.yesPrizeDesc}</p>
                    </div>
                  </div>
                </SelectionCard>

                <SelectionCard
                  selected={form.hasPrize === false}
                  onClick={() => { set('hasPrize', false); set('prizeType', null) }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">🤝</span>
                    <div>
                      <p className="font-semibold text-gray-900">{cp.noPrize}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{cp.noPrizeDesc}</p>
                    </div>
                  </div>
                </SelectionCard>
              </div>

              {/* Prize type sub-selection (only when hasPrize = true) */}
              {form.hasPrize === true && (
                <div className="space-y-3 pt-2">
                  <p className="text-sm font-semibold text-gray-700">{cp.prizeTypeQuestion}</p>
                  <SelectionCard
                    selected={form.prizeType === 'fixed'}
                    onClick={() => set('prizeType', 'fixed')}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">💰</span>
                      <div>
                        <p className="font-semibold text-gray-900">{cp.fixedPrize}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{cp.fixedPrizeDesc}</p>
                      </div>
                    </div>
                  </SelectionCard>

                  <SelectionCard
                    selected={form.prizeType === 'per_entry'}
                    onClick={() => set('prizeType', 'per_entry')}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">🎯</span>
                      <div>
                        <p className="font-semibold text-gray-900">{cp.perEntry}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{cp.perEntryDesc}</p>
                      </div>
                    </div>
                  </SelectionCard>
                </div>
              )}

              <button
                type="button"
                onClick={goNext}
                disabled={form.hasPrize === null || (form.hasPrize === true && !form.prizeType)}
                className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {cp.next}
              </button>
            </div>
          )}

          {/* ── Step 3a: Fixed prizes ───────────────────────────────── */}
          {step === '3a' && (
            <div className="space-y-5">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                {cp.step3aLabel}
              </p>
              <p className="text-sm text-gray-500">{cp.fixedDesc}</p>

              {[
                { key: 'prize1stFixed' as const, label: cp.first, icon: '🥇', required: true },
                { key: 'prize2ndFixed' as const, label: cp.second, icon: '🥈', required: false },
                { key: 'prize3rdFixed' as const, label: cp.third, icon: '🥉', required: false },
              ].map(({ key, label, icon, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {icon} {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                    {!required && <span className="text-gray-400 font-normal ml-1">({cp.optional})</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{sym}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 pl-8 pr-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                </div>
              ))}

              {fixedTotal() > 0 && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                  {cp.prizePoolPreview}: <strong>{sym}{fixedTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> {cp.total}
                </div>
              )}

              <button
                type="button"
                onClick={goNext}
                disabled={!form.prize1stFixed}
                className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {cp.next}
              </button>
            </div>
          )}

          {/* ── Step 3b: Entry fee prizes ───────────────────────────── */}
          {step === '3b' && (
            <div className="space-y-5">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                {cp.step3bLabel}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {cp.entryFeeLabel} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{sym}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.entryFee}
                    onChange={(e) => set('entryFee', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 pl-8 pr-4 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">{cp.distLabel}</p>

                {[
                  { key: 'prize1stPct' as const, label: cp.first, icon: '🥇' },
                  { key: 'prize2ndPct' as const, label: cp.second, icon: '🥈' },
                  { key: 'prize3rdPct' as const, label: cp.third, icon: '🥉' },
                ].map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-lg w-6 shrink-0">{icon}</span>
                    <label className="text-sm text-gray-700 w-24 shrink-0">{label}</label>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder="0"
                        value={form[key]}
                        onChange={(e) => set(key, e.target.value)}
                        className="w-full rounded-lg border border-gray-300 pl-4 pr-8 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                ))}

                {/* Percentage total indicator */}
                <div className={`text-xs font-medium text-right ${pctTotal() === 100 ? 'text-green-600' : pctTotal() > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {cp.total}: {pctTotal()}%
                  {pctTotal() === 100 && ' ✓'}
                </div>
              </div>

              {/* Winner takes all */}
              {form.prize1stPct === '100' && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm font-semibold text-amber-800 text-center">
                  🏆 {cp.winnerTakesAll}
                </div>
              )}

              {/* Example calculation */}
              {form.entryFee && parseFloat(form.entryFee) > 0 && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cp.exampleWith10}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{cp.pot}</span>
                    <span className="font-semibold text-gray-800">{sym}{examplePot().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {form.prize1stPct && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">🥇 {form.prize1stPct}%</span>
                      <span className="font-semibold text-green-700">{sym}{examplePrize(form.prize1stPct).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {form.prize2ndPct && parseFloat(form.prize2ndPct) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">🥈 {form.prize2ndPct}%</span>
                      <span className="font-semibold text-gray-700">{sym}{examplePrize(form.prize2ndPct).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {form.prize3rdPct && parseFloat(form.prize3rdPct) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">🥉 {form.prize3rdPct}%</span>
                      <span className="font-semibold text-gray-700">{sym}{examplePrize(form.prize3rdPct).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={goNext}
                disabled={!form.entryFee || pctTotal() !== 100 || !form.prize1stPct}
                className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {cp.next}
              </button>
            </div>
          )}

          {/* ── Step 4: Review ──────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">
                {cp.step4Label}
              </p>

              <div className="rounded-xl border border-gray-200 bg-gray-50 divide-y divide-gray-200 overflow-hidden">
                {/* Pool basics */}
                <div className="px-4 py-3 space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{cp.step1Label}</p>
                  <p className="font-semibold text-gray-900">{form.name}</p>
                  {form.description && <p className="text-sm text-gray-500">{form.description}</p>}
                  <p className="text-sm text-gray-600">{cp.currencyLabel}: <span className="font-medium">{form.currency}</span></p>
                </div>

                {/* Prize summary */}
                <div className="px-4 py-3 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{cp.step2Label}</p>
                  {!form.hasPrize ? (
                    <p className="text-sm text-gray-600">🤝 {cp.noPrize}</p>
                  ) : form.prizeType === 'fixed' ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-800">💰 {cp.fixedPrize}</p>
                      {form.prize1stFixed && <p className="text-sm text-gray-600">🥇 {sym}{parseFloat(form.prize1stFixed).toLocaleString()}</p>}
                      {form.prize2ndFixed && parseFloat(form.prize2ndFixed) > 0 && <p className="text-sm text-gray-600">🥈 {sym}{parseFloat(form.prize2ndFixed).toLocaleString()}</p>}
                      {form.prize3rdFixed && parseFloat(form.prize3rdFixed) > 0 && <p className="text-sm text-gray-600">🥉 {sym}{parseFloat(form.prize3rdFixed).toLocaleString()}</p>}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-800">🎯 {cp.perEntry}</p>
                      <p className="text-sm text-gray-600">{cp.entryFeeLabel}: {sym}{parseFloat(form.entryFee).toLocaleString()}</p>
                      {form.prize1stPct && <p className="text-sm text-gray-600">🥇 {form.prize1stPct}%</p>}
                      {form.prize2ndPct && parseFloat(form.prize2ndPct) > 0 && <p className="text-sm text-gray-600">🥈 {form.prize2ndPct}%</p>}
                      {form.prize3rdPct && parseFloat(form.prize3rdPct) > 0 && <p className="text-sm text-gray-600">🥉 {form.prize3rdPct}%</p>}
                      {form.prize1stPct === '100' && (
                        <p className="text-sm font-semibold text-amber-700">🏆 {cp.winnerTakesAll}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? cp.creating : cp.createPool}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
