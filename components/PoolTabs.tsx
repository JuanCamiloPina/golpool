'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/components/LanguageContext'

type ActiveTab = 'home' | 'predict' | 'bonus' | 'standings' | 'summary' | 'poolinfo'

interface PoolTabsProps {
  poolId: string
  activeTab: ActiveTab
}

export default function PoolTabs({ poolId, activeTab }: PoolTabsProps) {
  const { t } = useLang()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient()
      const [{ data: { user } }, { data: pool }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('pools').select('owner_id').eq('id', poolId).single(),
      ])
      setIsAdmin(!!user && !!pool && pool.owner_id === user.id)
    }
    checkAdmin()
  }, [poolId])

  const tabs = [
    { key: 'home',      label: `🏠 ${t.tabs.home}`,      href: `/pools/${poolId}`             },
    { key: 'predict',   label: `⚽ ${t.tabs.predict}`,   href: `/pools/${poolId}/predict`     },
    { key: 'bonus',     label: `⭐ ${t.tabs.bonus}`,     href: `/pools/${poolId}/bonus`       },
    { key: 'standings', label: `🏆 ${t.tabs.standings}`, href: `/pools/${poolId}/leaderboard` },
    { key: 'summary',   label: `📊 ${t.tabs.summary}`,   href: `/pools/${poolId}/summary`     },
    { key: 'poolinfo',  label: `📋 ${t.tabs.poolInfo}`,  href: `/pools/${poolId}?tab=info`    },
  ] as const

  return (
    <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            tab.key === activeTab
              ? 'border-green-500 text-green-700'
              : 'border-transparent text-gray-500 hover:text-green-700 hover:border-green-400'
          }`}
        >
          {tab.label}
        </Link>
      ))}
      {isAdmin && (
        <Link
          href={`/pools/${poolId}/admin`}
          className="shrink-0 ml-auto px-4 py-2 text-sm font-medium border-b-2 border-transparent text-green-700 hover:text-green-800 hover:border-green-500 transition-colors"
        >
          {t.tabs.manage}
        </Link>
      )}
    </div>
  )
}
