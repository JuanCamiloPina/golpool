import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase-server'
import { LanguageProvider } from '@/components/LanguageContext'
import NavBar from '@/components/NavBar'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GolPool — World Cup 2026 Prediction Pool',
  description: 'Predict World Cup 2026 match scores, compete with friends, and win your pool.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    userName = profile?.full_name ?? null
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin = user ? adminEmails.includes((user.email ?? '').toLowerCase()) : false

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900 antialiased">
        <LanguageProvider>
          <NavBar userEmail={user?.email ?? null} userName={userName} isAdmin={isAdmin} />
          <main className="flex-1 flex flex-col">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  )
}
