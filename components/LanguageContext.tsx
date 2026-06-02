'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { translations, type Lang, type Translations } from '@/lib/i18n'

interface LanguageContextValue {
  lang: Lang
  t: Translations
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const t = translations[lang]
  const toggleLang = () => setLang((l) => (l === 'en' ? 'es' : 'en'))

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider')
  return ctx
}
