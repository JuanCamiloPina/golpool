'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'
import type { Lang } from '@/lib/i18n'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const { t, lang: ctxLang, toggleLang } = useLang()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedLang, setSelectedLang] = useState<Lang>(ctxLang)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t.auth.passwordTooShort)
      return
    }
    if (password !== confirmPassword) {
      setError(t.auth.passwordMismatch)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, language: selectedLang },
        // Preserve the next param through the email verification callback
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Supabase may auto-confirm (no email step) or require verification.
    // Either way, redirect to next so the join flow continues immediately
    // for users who are auto-confirmed, and the callback handles the rest.
    router.push(next)
    router.refresh()
  }

  function handleLangChange(l: Lang) {
    setSelectedLang(l)
    if (l !== ctxLang) toggleLang()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="text-center mb-8">
        <span className="text-4xl">⚽</span>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">{t.auth.signupTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.auth.signupSubtitle}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            {t.auth.fullName}
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {t.auth.email}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {t.auth.password}
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            {t.auth.confirmPassword}
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.auth.language}
          </label>
          <div className="flex gap-3">
            {(['en', 'es'] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => handleLangChange(l)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  selectedLang === l
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {l === 'en' ? '🇬🇧 English' : '🇪🇸 Español'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-60 transition-colors"
        >
          {loading ? '…' : t.auth.signupButton}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t.auth.haveAccount}{' '}
        <Link
          href={`/auth/login${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-medium text-green-600 hover:text-green-700"
        >
          {t.nav.login}
        </Link>
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="bg-white rounded-2xl p-8 text-center text-gray-400">Loading…</div>}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  )
}
