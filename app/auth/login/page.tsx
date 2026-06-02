'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const { t } = useLang()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="text-center mb-8">
        <span className="text-4xl">⚽</span>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">{t.auth.loginTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.auth.loginSubtitle}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
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
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t.auth.password}
            </label>
            <Link href="/auth/forgot-password" className="text-xs text-green-600 hover:text-green-700">
              {t.auth.forgotPassword}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-60 transition-colors"
        >
          {loading ? '…' : t.auth.loginButton}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        {t.auth.noAccount}{' '}
        <Link
          href={`/auth/signup${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-medium text-green-600 hover:text-green-700"
        >
          {t.nav.signup}
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="bg-white rounded-2xl p-8 text-center text-gray-400">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
