'use client'

import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 text-xs font-medium text-green-700 border border-green-300 rounded-full px-3 py-1 hover:bg-green-50 transition-colors"
    >
      {copied ? '✓ Copied' : 'Copy link'}
    </button>
  )
}
