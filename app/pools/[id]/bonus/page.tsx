'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'
import PoolTabs from '@/components/PoolTabs'
import { formatDeadlineShort } from '@/lib/date-utils'
import SearchableSelect from '@/components/SearchableSelect'
import { WC2026_PLAYERS } from '@/lib/wc2026-players'
import { getTeamName, getTeamEnglishName, getTeamOptions, getTeamFlagCode, getTeamFlagCodesMap } from '@/lib/wc2026-teams'
import FlagImage from '@/components/FlagImage'
import { BONUS_SCORING } from '@/lib/scoring'
import type { Lang } from '@/lib/i18n'

const BONUS_QUESTIONS = [
  { key: 'winner',       labelKey: 'winner'      as const, type: 'team'       },
  { key: 'runner_up',    labelKey: 'runnerUp'    as const, type: 'team'       },
  { key: 'third_place',  labelKey: 'third'       as const, type: 'team'       },
  { key: 'golden_ball',  labelKey: 'goldenBall'  as const, type: 'player'     },
  { key: 'golden_boot',  labelKey: 'goldenBoot'  as const, type: 'player'     },
  { key: 'golden_glove', labelKey: 'goldenGlove' as const, type: 'goalkeeper' },
]

// Build a { "Player Name (Translated Country)": flagCode } map from an options array.
// The stored country in the option string may be in any language; we resolve it back
// to English via getTeamEnglishName before looking up the flag code.
function buildPlayerIconsMap(options: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const opt of options) {
    const match = opt.match(/\(([^)]+)\)$/)
    if (!match) continue
    const code = getTeamFlagCode(getTeamEnglishName(match[1]))
    if (code) map[opt] = code
  }
  return map
}

// Translate the country portion of a stored "Player (EnglishCountry)" string.
function localizePlayerString(stored: string, lang: Lang): string {
  if (!stored) return stored
  const match = stored.match(/^(.*)\(([^)]+)\)$/)
  if (!match) return stored
  return `${match[1].trimEnd()} (${getTeamName(match[2], lang)})`
}

// Convert a display-language "Player (DisplayCountry)" back to "Player (EnglishCountry)".
function normalizePlayerToEnglish(display: string): string {
  const match = display.match(/^(.*)\(([^)]+)\)$/)
  if (!match) return display
  return `${match[1].trimEnd()} (${getTeamEnglishName(match[2])})`
}

// Extract the flag code from a stored "Player (EnglishCountry)" answer.
function playerFlagCode(stored: string): string {
  const match = stored.match(/\(([^)]+)\)$/)
  return match ? getTeamFlagCode(match[1]) : ''
}

interface Member { userId: string; fullName: string }

function useCountdown(deadline: string | null) {
  const [label, setLabel] = useState('')
  const [closed, setClosed] = useState(false)

  const tick = useCallback(() => {
    if (!deadline) return
    const diff = new Date(deadline).getTime() - Date.now()
    if (diff <= 0) { setClosed(true); setLabel(''); return }
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    setLabel(d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`)
  }, [deadline])

  useEffect(() => {
    if (!deadline) return
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline, tick])

  return { label, closed }
}

export default function BonusPage() {
  const { t, lang } = useLang()
  const router = useRouter()
  const params = useParams()
  const poolId = params.id as string

  const [answers, setAnswers]         = useState<Record<string, string>>({})
  const [bonusPoints, setBonusPoints] = useState<Record<string, number>>({})
  const [deadline, setDeadline]       = useState<string | null>(null)
  const [isEditing, setIsEditing]     = useState(false)
  const [invalidFields, setInvalid]   = useState<Set<string>>(new Set())
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [userId, setUserId]           = useState<string | null>(null)

  const [members, setMembers]         = useState<Member[]>([])
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [viewingName, setViewingName] = useState<string | null>(null)
  const [playerSearch, setPlayerSearch]   = useState('')
  const [playerFocused, setPlayerFocused] = useState(false)
  const playerInputRef = useRef<HTMLInputElement>(null)

  const { label: bonusCountdown, closed } = useCountdown(deadline)

  // Clear search state whenever viewing resets to self
  useEffect(() => {
    if (!viewingUserId) { setPlayerSearch(''); setPlayerFocused(false) }
  }, [viewingUserId])

  // Rebuild player option lists when the display language changes
  const playerOptions = useMemo(() =>
    WC2026_PLAYERS
      .map((p) => `${p.name} (${getTeamName(p.country, lang)})`)
      .sort((a, b) => a.localeCompare(b)),
    [lang]
  )

  const goalkeeperOptions = useMemo(() =>
    WC2026_PLAYERS
      .filter((p) => p.position === 'goalkeeper')
      .map((p) => `${p.name} (${getTeamName(p.country, lang)})`)
      .sort((a, b) => a.localeCompare(b)),
    [lang]
  )

  const playerIconsMap     = useMemo(() => buildPlayerIconsMap(playerOptions),     [playerOptions])
  const goalkeeperIconsMap = useMemo(() => buildPlayerIconsMap(goalkeeperOptions), [goalkeeperOptions])

  const playerResults = (playerFocused || playerSearch.trim())
    ? members.filter(
        (m) =>
          m.userId !== userId &&
          (!playerSearch.trim() ||
            m.fullName.toLowerCase().includes(playerSearch.toLowerCase().trim()))
      )
    : []

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data: membership } = await supabase
        .from('pool_members')
        .select('status')
        .eq('pool_id', poolId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membership || membership.status !== 'approved') {
        router.push(`/pools/${poolId}`)
        return
      }

      const { data: round } = await supabase
        .from('rounds')
        .select('prediction_deadline')
        .eq('name', 'Group Stage – Matchday 1')
        .single()

      const dl = round?.prediction_deadline ?? null
      const isClosed = dl ? new Date(dl) <= new Date() : false
      setDeadline(dl)

      const { data: existing } = await supabase
        .from('bonus_predictions')
        .select('question, answer, points_earned')
        .eq('pool_id', poolId)
        .eq('user_id', user.id)

      const answerMap: Record<string, string> = {}
      const pointsMap: Record<string, number> = {}
      for (const row of existing ?? []) {
        answerMap[row.question] = row.answer
        pointsMap[row.question] = row.points_earned ?? 0
      }
      setAnswers(answerMap)
      setBonusPoints(pointsMap)

      const hasAnyAnswer = Object.values(answerMap).some((v) => v.trim() !== '')
      setIsEditing(!hasAnyAnswer && !isClosed)
      setLoading(false)
    }
    load()
  }, [poolId, router])

  // Load member list as soon as the user is known
  useEffect(() => {
    if (!userId || !poolId) return
    fetch(`/api/pools/${poolId}/members/list`)
      .then((r) => r.ok ? r.json() : { members: [] })
      .then((d) => setMembers(d.members ?? []))
  }, [userId, poolId])

  async function handleSave() {
    if (!userId || closed) return

    const missing = new Set(
      BONUS_QUESTIONS
        .filter((q) => !(answers[q.key] ?? '').trim())
        .map((q) => q.key)
    )

    if (missing.size > 0) {
      setInvalid(missing)
      setError(t.bonus.incompleteError)
      return
    }

    setSaving(true); setError(null); setInvalid(new Set())

    const supabase = createClient()
    const rows = BONUS_QUESTIONS.map((q) => ({
      user_id:  userId,
      pool_id:  poolId,
      question: q.key,
      answer:   answers[q.key] ?? '',
    }))

    const { error: deleteError } = await supabase
      .from('bonus_predictions')
      .delete()
      .eq('pool_id', poolId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('[bonus save] delete error:', deleteError)
      setSaving(false)
      setError(`Save failed (delete): ${deleteError.message}`)
      return
    }

    const { error: insertError } = await supabase
      .from('bonus_predictions')
      .insert(rows.filter((r) => r.answer.trim()))

    setSaving(false)
    if (insertError) {
      console.error('[bonus save] insert error:', insertError)
      setError(`Save failed (insert): ${insertError.message}`)
    } else {
      setSaved(true)
      setIsEditing(false)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  async function loadViewingBonus(uid: string) {
    const res = await fetch(`/api/pools/${poolId}/bonus?user_id=${uid}`)
    if (!res.ok) return
    const data = await res.json()
    const answerMap: Record<string, string> = {}
    const pointsMap: Record<string, number> = {}
    for (const row of data.bonus ?? []) {
      answerMap[row.question] = row.answer
      pointsMap[row.question] = row.points_earned ?? 0
    }
    setAnswers(answerMap)
    setBonusPoints(pointsMap)
  }

  function resetViewing() {
    setViewingUserId(null)
    setViewingName(null)
    if (!userId) return
    const supabase = createClient()
    supabase
      .from('bonus_predictions')
      .select('question, answer, points_earned')
      .eq('pool_id', poolId)
      .eq('user_id', userId)
      .then(({ data }) => {
        const answerMap: Record<string, string> = {}
        const pointsMap: Record<string, number> = {}
        for (const row of data ?? []) {
          answerMap[row.question] = row.answer
          pointsMap[row.question] = row.points_earned ?? 0
        }
        setAnswers(answerMap)
        setBonusPoints(pointsMap)
      })
  }

  function getOptions(type: string): string[] {
    if (type === 'team')       return getTeamOptions(lang)
    if (type === 'goalkeeper') return goalkeeperOptions
    return playerOptions
  }

  function getIconsMap(type: string): Record<string, string> | undefined {
    if (type === 'team')       return getTeamFlagCodesMap(lang)
    if (type === 'goalkeeper') return goalkeeperIconsMap
    return playerIconsMap
  }

  // Returns the localised display string for the stored (English) answer.
  function displayValue(q: typeof BONUS_QUESTIONS[number], src = answers): string {
    const stored = src[q.key] ?? ''
    if (!stored) return ''
    if (q.type === 'team') return getTeamName(stored, lang)
    return localizePlayerString(stored, lang)
  }

  const labels = t.bonus
  const totalBonusPoints = Object.values(bonusPoints).reduce((s, p) => s + p, 0)

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 w-full">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const isViewingOther = !!viewingUserId

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">

      {/* Back + nav tabs */}
      <div>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          {labels.back}
        </Link>
        <div className="mt-4">
          <PoolTabs poolId={poolId} activeTab="bonus" />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{labels.title}</h1>
          {deadline && !closed ? (
            <div className="mt-0.5 text-sm text-gray-500">
              {labels.closesIn}{' '}
              <span className="font-semibold text-green-700 tabular-nums">{bonusCountdown}</span>
              {' '}
              <span className="text-xs text-gray-400">
                {labels.deadlineAt} {formatDeadlineShort(deadline, lang)}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500">{labels.subtitle}</p>
          )}
        </div>
        {!closed && !isEditing && !isViewingOther && (
          <button
            onClick={() => { setIsEditing(true); setError(null) }}
            className="rounded-full border border-green-300 px-4 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
          >
            {labels.edit}
          </button>
        )}
        {!closed && isEditing && !isViewingOther && (
          <button
            onClick={() => { setIsEditing(false); setSaved(false); setError(null); setInvalid(new Set()) }}
            className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:border-gray-400 transition-colors"
          >
            {labels.cancel}
          </button>
        )}
      </div>

      {/* Total bonus points banner */}
      {totalBonusPoints > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-amber-800">
            ⭐ {labels.totalPoints}
          </span>
          <span className="text-base font-bold text-amber-700 tabular-nums">
            {totalBonusPoints} / {Object.values(BONUS_SCORING).reduce((s, p) => s + p, 0)} pts
          </span>
        </div>
      )}

      {/* Player search — only after deadline */}
      {closed && members.length > 1 && (
        <div className="relative">
          <p className="text-xs font-medium text-gray-500 mb-1.5">👁 {labels.viewingPlayer}:</p>
          <input
            ref={playerInputRef}
            type="text"
            value={playerSearch}
            onFocus={() => setPlayerFocused(true)}
            onBlur={() => { setPlayerFocused(false) }}
            onChange={(e) => setPlayerSearch(e.target.value)}
            placeholder={labels.searchPlayer}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
          {playerResults.length > 0 && (
            <ul className="absolute z-50 top-full mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl max-h-52 overflow-y-auto py-1">
              {playerResults.map((m) => (
                <li
                  key={m.userId}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setPlayerFocused(false)
                    setPlayerSearch('')
                    playerInputRef.current?.blur()
                    setViewingUserId(m.userId)
                    setViewingName(m.fullName)
                    loadViewingBonus(m.userId)
                  }}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 cursor-pointer"
                >
                  {m.fullName}
                </li>
              ))}
            </ul>
          )}
          {playerFocused && playerSearch.trim() && playerResults.length === 0 && (
            <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl px-3 py-2 text-sm text-gray-400">
              {labels.searchHint}
            </div>
          )}
        </div>
      )}

      {/* Viewing banner */}
      {isViewingOther && viewingName && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 flex items-center justify-between">
          <span>👁 {labels.viewingPlayer}: <strong>{viewingName}</strong></span>
          <button onClick={resetViewing} className="text-blue-600 underline text-xs ml-3 shrink-0">
            {labels.myPredictions}
          </button>
        </div>
      )}

      {closed && !isViewingOther && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          🔒 {labels.locked}
        </div>
      )}

      {saved && !isEditing && !isViewingOther && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 text-center font-medium">
          {labels.saved}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {BONUS_QUESTIONS.map((q) => {
          const invalid  = invalidFields.has(q.key)
          const pts      = bonusPoints[q.key] ?? 0
          const maxPts   = BONUS_SCORING[q.key] ?? 0
          const answered = !!(answers[q.key] ?? '').trim()
          const stored   = answers[q.key] ?? ''

          return (
            <div
              key={q.key}
              className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${
                invalid ? 'border-red-400' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  {labels[q.labelKey]}
                  {invalid && <span className="ml-1.5 text-xs text-red-500">⚠ required</span>}
                </label>
                {answered && (closed || pts > 0) && (
                  <span className={`shrink-0 text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                    pts > 0 ? 'text-green-700 bg-green-100' : 'text-gray-400 bg-gray-100'
                  }`}>
                    {pts > 0 ? `+${pts}` : '0'} / {maxPts} pts
                  </span>
                )}
              </div>

              {isEditing && !isViewingOther ? (
                <SearchableSelect
                  options={getOptions(q.type)}
                  value={displayValue(q)}
                  icons={getIconsMap(q.type)}
                  onChange={(v) => {
                    // Always store in English so the DB value is language-independent
                    const toStore = q.type === 'team'
                      ? getTeamEnglishName(v)
                      : normalizePlayerToEnglish(v)
                    setAnswers((a) => ({ ...a, [q.key]: toStore }))
                    if (toStore.trim()) setInvalid((s) => { const n = new Set(s); n.delete(q.key); return n })
                  }}
                  placeholder={labels.placeholder}
                  hint={labels.searchHint}
                  disabled={closed}
                />
              ) : (
                <div className={`flex items-center gap-2 text-sm py-2 px-3 rounded-lg bg-gray-50 ${displayValue(q) ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                  {stored && q.type === 'team' && (
                    <FlagImage countryCode={getTeamFlagCode(stored)} />
                  )}
                  {stored && q.type !== 'team' && playerFlagCode(stored) && (
                    <FlagImage countryCode={playerFlagCode(stored)} />
                  )}
                  <span>{displayValue(q) || labels.noAnswer}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Save button — only in edit mode, own predictions */}
      {isEditing && !closed && !isViewingOther && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          {saving ? labels.saving : labels.save}
        </button>
      )}
    </div>
  )
}
