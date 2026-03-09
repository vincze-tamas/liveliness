'use client'

import { useState } from 'react'
import { Mountain, RefreshCw, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SportBadge, type SportType } from '@/components/activities/SportBadge'
import { cn } from '@/lib/utils'

type FilterSport = 'all' | SportType

const sportFilters: { value: FilterSport; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'trail_run', label: 'Trail Run' },
  { value: 'mtb', label: 'MTB' },
  { value: 'road_bike', label: 'Road Bike' },
  { value: 'ski_alpine', label: 'Ski' },
  { value: 'inline_skate', label: 'Inline Skate' },
  { value: 'gym', label: 'Gym' },
]

const sportColors: Record<SportType, string> = {
  trail_run: 'bg-teal-600 text-white border-teal-600',
  mtb: 'bg-amber-600 text-white border-amber-600',
  road_bike: 'bg-indigo-500 text-white border-indigo-500',
  ski_alpine: 'bg-sky-400 text-white border-sky-400',
  inline_skate: 'bg-pink-400 text-white border-pink-400',
  gym: 'bg-purple-500 text-white border-purple-500',
}

export default function ActivitiesPage() {
  const [activeFilter, setActiveFilter] = useState<FilterSport>('all')

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Activities
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          All your training sessions
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
        {sportFilters.map(({ value, label }) => {
          const isActive = activeFilter === value
          const colorClass =
            value !== 'all' && isActive
              ? sportColors[value as SportType]
              : undefined

          return (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                isActive && value === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                  : isActive && colorClass
                    ? colorClass
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800">
          <Mountain className="w-10 h-10 text-slate-400 dark:text-slate-500" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            No activities yet
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
            Sync Garmin or import Apple Health to get started
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
          <Button variant="outline" size="sm" className="flex-1 gap-2">
            <RefreshCw className="w-4 h-4" />
            Sync Garmin
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-2">
            <Smartphone className="w-4 h-4" />
            Import Apple Health
          </Button>
        </div>
      </div>
    </div>
  )
}
