'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'
import type { Lang } from '@/lib/i18n'

export default function ProfilePage() {
  const { t, lang, setLang } = useLang()
  const tp = t.profile
  const router = useRouter()

  const [loading, setLoading]   = useState(true)
  const [userId, setUserId]     = useState<string | null>(null)
  const [email, setEmail]       = useState('')

  // Profile form
  const [fullName, setFullName]         = useState('')
  const [language, setLanguage]         = useState<Lang>(lang)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved]   = useState(false)
  const [profileError, setProfileError]   = useState<string | null>(null)

  // Password form
  const [newPassword, setNewPassword]       = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved]   = useState(false)
  const [passwordError, setPasswordError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, language')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        setFullName(profile.full_name ?? '')
        const savedLang = (profile.language ?? 'en') as Lang
        setLanguage(savedLang)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSaveProfile() {
    if (!userId) return
    setProfileSaving(true)
    setProfileError(null)
    setProfileSaved(false)

    const payload = { full_name: fullName.trim(), language }
    console.log('[profile] updating profiles for user', userId, payload)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)

    setProfileSaving(false)
    if (error) {
      setProfileError(error.message)
    } else {
      setLang(language)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    }
  }

  async function handleChangePassword() {
    setPasswordError(null)
    setPasswordSaved(false)

    if (newPassword.length < 8) {
      setPasswordError(tp.passwordTooShort)
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(tp.passwordMismatch)
      return
    }

    setPasswordSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSaved(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSaved(false), 6000)
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded-xl w-40" />
          <div className="h-52 bg-gray-100 rounded-2xl" />
          <div className="h-44 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* Back + title */}
      <div>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{tp.title}</h1>
      </div>

      {/* Card 1 — Personal Information */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-gray-800">{tp.personalInfo}</h2>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {tp.fullName}
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        {/* Email — read only */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {lang === 'es' ? 'Correo electrónico' : 'Email'}
          </label>
          <p className="text-sm text-gray-900 font-medium py-0.5">{email}</p>
          <p className="text-xs text-gray-400 mt-0.5">{tp.emailReadOnly}</p>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {tp.language}
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Lang)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:outline-none bg-white"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 flex-wrap pt-1">
          <button
            onClick={handleSaveProfile}
            disabled={profileSaving}
            className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {profileSaving ? '…' : tp.saveProfile}
          </button>
          {profileSaved && (
            <span className="text-sm text-green-700 font-medium">✓ {tp.profileSaved}</span>
          )}
          {profileError && (
            <span className="text-sm text-red-600">{profileError}</span>
          )}
        </div>
      </div>

      {/* Card 2 — Change Password */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-gray-800">{tp.changePassword}</h2>

        {/* New Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {tp.newPassword}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {tp.confirmPassword}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 flex-wrap pt-1">
          <button
            onClick={handleChangePassword}
            disabled={passwordSaving}
            className="rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {passwordSaving ? '…' : tp.savePassword}
          </button>
          {passwordSaved && (
            <span className="text-sm text-green-700 font-medium">✓ {tp.passwordSaved}</span>
          )}
          {passwordError && (
            <span className="text-sm text-red-600">{passwordError}</span>
          )}
        </div>
      </div>

    </div>
  )
}
