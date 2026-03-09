'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Zap, Settings } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/activities': 'Activities',
  '/training': 'Training',
  '/nutrition': 'Nutrition',
  '/weights': 'Weight Training',
  '/statistics': 'Statistics',
  '/statistics/weekly': 'Weekly Stats',
  '/statistics/monthly': 'Monthly Stats',
  '/statistics/alltime': 'All-Time Stats',
  '/coach': 'AI Coach',
  '/profile': 'Profile',
  '/setup': 'Setup',
  '/offline': 'Offline',
}

export function TopHeader() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Liveliness'

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4">
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-600">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-slate-900 dark:text-white text-base">
          {pathname === '/' ? (
            <span className="text-teal-600 dark:text-teal-400">Liveliness</span>
          ) : (
            title
          )}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/setup"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Setup"
        >
          <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </Link>
        <Link
          href="/profile"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Profile"
        >
          <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </Link>
      </div>
    </header>
  )
}
