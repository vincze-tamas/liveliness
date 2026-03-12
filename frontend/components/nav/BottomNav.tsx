'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Activity,
  Calendar,
  Apple,
  BarChart2,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/activities', label: 'Activities', icon: Activity },
  { href: '/training', label: 'Training', icon: Calendar },
  { href: '/nutrition', label: 'Nutrition', icon: Apple },
  { href: '/statistics', label: 'Stats', icon: BarChart2 },
  { href: '/coach', label: 'Coach', icon: MessageCircle },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-inset-bottom">
      <div className="flex items-stretch justify-around h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-1 text-xs font-medium transition-colors',
                isActive
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform',
                  isActive && 'scale-110'
                )}
                strokeWidth={isActive ? 2.5 : 1.75}
              />
              <span className="leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
