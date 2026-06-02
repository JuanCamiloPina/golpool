'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'

type PageState = 'loading' | 'form' | 'submitting' | 'success' | 'invalid'

export default function ResetPasswordPage() {
  const { t } = useLang()
  const router = useRouter()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [password, setPassword]   = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setPageState(session ? 'form' : 'invalid')
    })
  }, [])

  useEffect(() => {
    if (pageState !== 'success') return
    const id = setTimeout(() => router.push('/auth/login'), 2000)
    return () => clearTimeout(id)
  }, [pageState, router])

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

    setPageState('submitting')
    const supabase = createClient()

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError('Failed to update password. Please request a new code.')
      setPageState('form')
      return
    }

    await supabase.auth.signOut()
    setPageState('success')
  }

  // ── Loading ────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-400">Verifying…</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Invalid / no session ───────────────────────────────────────────
  if (pageState === 'invalid') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Session expired</h1>
            <p className="text-sm text-gray-500 mb-6">
              Your verification code has expired or was already used. Please request a new one.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
            >
              Request a new code
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Your password has been changed. Redirecting to login…
            </p>
            <Link
              href="/auth/login"
              className="inline-block rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Form (also used while submitting) ─────────────────────────────
  const loading = pageState === 'submitting'

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <span className="text-4xl">🔒</span>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">{t.auth.resetTitle}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.auth.resetSubtitle}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              <Link
                href="/auth/forgot-password"
                className="mt-1 inline-block font-medium underline underline-offset-2"
              >
                Request a new code →
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {loading ? '…' : t.auth.resetButton}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
