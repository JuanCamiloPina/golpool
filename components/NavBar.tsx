'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'

interface NavBarProps {
  userEmail: string | null
  userName: string | null
  isAdmin?: boolean
}

export default function NavBar({ userEmail, userName, isAdmin = false }: NavBarProps) {
  const router = useRouter()
  const { t, lang, toggleLang } = useLang()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo — dashboard if logged in, landing page if not */}
          <Link href={userEmail ? '/dashboard' : '/'} className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <span className="text-xl font-bold text-green-600 tracking-tight">
              {t.nav.logo}
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="text-xs font-semibold text-gray-500 hover:text-green-600 border border-gray-200 rounded-full px-3 py-1 transition-colors"
              aria-label="Toggle language"
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>

            {userEmail ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin/matches"
                    className="hidden sm:inline text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 hover:bg-amber-100 transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-green-600 transition-colors"
                >
                  <span className="text-xs opacity-60">👤</span>
                  {userName ?? userEmail}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
                >
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-gray-700 hover:text-green-600 transition-colors"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/auth/signup"
                  className="text-sm font-semibold bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 transition-colors"
                >
                  {t.nav.signup}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
