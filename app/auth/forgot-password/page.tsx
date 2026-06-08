'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'

export default function ForgotPasswordPage() {
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <span className="text-4xl">🔑</span>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">{t.auth.forgotTitle}</h1>
            <p className="mt-1 text-sm text-gray-500">{t.auth.forgotSubtitle}</p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-5 text-sm text-green-800 space-y-2">
                <p className="font-semibold">{t.auth.checkEmailTitle}</p>
                <p className="text-green-700">
                  {t.auth.checkEmail.replace('{email}', email)}
                </p>
              </div>
              <Link
                href={`/auth/verify-otp?email=${encodeURIComponent(email)}&type=recovery`}
                className="block w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors text-center"
              >
                {t.auth.enterCode}
              </Link>
            </div>
          ) : (
            <>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {loading ? '…' : t.auth.sendResetLink}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link href="/auth/login" className="font-medium text-green-600 hover:text-green-700">
              {t.auth.backToLogin}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
