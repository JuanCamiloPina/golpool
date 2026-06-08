'use client'

import { useEffect, useState } from 'react'
import { useLang } from '@/components/LanguageContext'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const STORAGE_KEY = 'golpool_install_dismissed'
const DISMISS_MS  = 7 * 24 * 60 * 60 * 1000 // 7 days

function wasDismissed(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v !== null && Date.now() < Number(v)
  } catch { return false }
}

function saveDismiss() {
  try { localStorage.setItem(STORAGE_KEY, String(Date.now() + DISMISS_MS)) } catch {}
}

export default function InstallBanner() {
  const { lang } = useLang()
  const [show, setShow]         = useState(false)
  const [isIOS, setIsIOS]       = useState(false)
  const [prompt, setPrompt]     = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Already installed as standalone — never show
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (wasDismissed()) return

    const ua  = navigator.userAgent
    const ios = /iPhone|iPad|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream

    if (ios) {
      // iOS: check native standalone flag
      if ((navigator as Navigator & { standalone?: boolean }).standalone) return
      setIsIOS(true)
      setShow(true)
      return
    }

    // Chrome/Android: wait for the browser's installability signal
    const handler = (e: Event) => {
      e.preventDefault()
      if (!wasDismissed()) {
        setPrompt(e as BeforeInstallPromptEvent)
        setShow(true)
      }
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    saveDismiss()
    setShow(false)
  }

  async function handleInstall() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setPrompt(null)
  }

  if (!show) return null

  const headline  = lang === 'es'
    ? '¡Agrega GolPool a tu pantalla de inicio!'
    : 'Add GolPool to your home screen for quick access!'
  const iosHint   = lang === 'es'
    ? 'Toca Compartir ↑ → Agregar a pantalla de inicio'
    : 'Tap Share ↑ → Add to Home Screen'
  const installLbl = lang === 'es' ? 'Instalar' : 'Install'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-4 pointer-events-none">
      <div className="max-w-lg mx-auto rounded-2xl bg-green-600 text-white shadow-xl px-4 py-3 flex items-center gap-3 pointer-events-auto">
        <span className="text-2xl shrink-0" aria-hidden>⚽</span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">{headline}</p>
          {isIOS && (
            <p className="text-xs text-green-100 mt-0.5">{iosHint}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {prompt && (
            <button
              onClick={handleInstall}
              className="rounded-full bg-white text-green-700 px-3 py-1 text-xs font-semibold hover:bg-green-50 transition-colors"
            >
              {installLbl}
            </button>
          )}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-green-200 hover:text-white text-xl leading-none font-medium w-6 text-center transition-colors"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
