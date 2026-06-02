'use client'

import Link from 'next/link'
import { useLang } from '@/components/LanguageContext'

export default function Home() {
  const { t } = useLang()

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-600 to-green-800 text-white">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" aria-hidden>
          <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full bg-white" />
          <div className="absolute top-1/2 -right-20 w-96 h-96 rounded-full bg-white" />
          <div className="absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-white" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">
          <span className="inline-block bg-white/20 text-white text-xs font-semibold tracking-wider uppercase px-4 py-1.5 rounded-full mb-6">
            {t.landing.badge}
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            {t.landing.title}
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-green-100 mb-10">
            {t.landing.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-green-700 font-semibold px-8 py-3.5 hover:bg-green-50 transition-colors shadow-lg"
            >
              ⚽ {t.landing.createPool}
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/60 text-white font-semibold px-8 py-3.5 hover:bg-white/10 transition-colors"
            >
              🔗 {t.landing.joinPool}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { emoji: '📋', title: t.landing.feature1Title, desc: t.landing.feature1Desc },
            { emoji: '🏆', title: t.landing.feature2Title, desc: t.landing.feature2Desc },
            { emoji: '🔒', title: t.landing.feature3Title, desc: t.landing.feature3Desc },
          ].map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center text-center p-6 rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all"
            >
              <span className="text-4xl mb-4">{f.emoji}</span>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-green-50 border-t border-green-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Ready to play?
          </h2>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-full bg-green-600 text-white font-semibold px-8 py-3.5 hover:bg-green-700 transition-colors shadow-md"
          >
            Get Started — It&apos;s Free
          </Link>
        </div>
      </section>
    </div>
  )
}
