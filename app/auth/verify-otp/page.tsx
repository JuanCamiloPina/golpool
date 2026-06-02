'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'

function VerifyOtpForm() {
  const { t } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'recovery',
    })

    if (error) {
      setError(t.auth.otpInvalid)
      setLoading(false)
      return
    }

    router.push('/auth/reset-password')
  }

  async function handleResend() {
    setResent(false)
    setError(null)
    setResending(true)

    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    setResending(false)
    setResent(true)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="text-center mb-8">
        <span className="text-4xl">📬</span>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">{t.auth.otpTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t.auth.otpSubtitle}{' '}
          <span className="font-medium text-gray-700">{email}</span>
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {resent && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {t.auth.otpResent}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
            {t.auth.otpCodeLabel}
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6,8}"
            maxLength={8}
            required
            autoComplete="one-time-code"
            placeholder="00000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-2xl font-mono tracking-[0.5em] text-center text-gray-900 placeholder-gray-300 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.length < 6 || code.length > 8}
          className="w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          {loading ? '…' : t.auth.otpVerify}
        </button>
      </form>

      <div className="mt-6 text-center space-y-3">
        <p className="text-sm text-gray-500">
          {t.auth.otpNoCode}{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-medium text-green-600 hover:text-green-700 disabled:opacity-60"
          >
            {resending ? '…' : t.auth.otpResend}
          </button>
        </p>
        <Link href="/auth/login" className="block text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
          {t.auth.backToLogin}
        </Link>
      </div>
    </div>
  )
}

export default function VerifyOtpPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="bg-white rounded-2xl p-8 text-center text-gray-400">Loading…</div>}>
          <VerifyOtpForm />
        </Suspense>
      </div>
    </div>
  )
}
