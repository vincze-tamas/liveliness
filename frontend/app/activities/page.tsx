'use client'

import { useState } from 'react'
import { Mountain, RefreshCw, Smartphone, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { SportBadge, type SportType } from '@/components/activities/SportBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { formatDuration, formatDistance, formatLongDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type FilterSport = 'all' | SportType

interface ActivityRead {
  id: number
  sport: string | null
  start_time: string | null
  duration_s: number | null
  distance_m: number | null
  elevation_gain_m: number | null
  avg_hr: number | null
}

const KNOWN_SPORTS: SportType[] = ['trail_run', 'mtb', 'road_bike', 'ski_alpine', 'inline_skate', 'gym']

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

  const { data: activities, isLoading } = useQuery<ActivityRead[]>({
    queryKey: ['activities-all'],
    queryFn: () => apiFetch<ActivityRead[]>('/api/activities?limit=200'),
  })

  const filtered = activities
    ? activeFilter === 'all'
      ? activities
      : activities.filter((a) => a.sport === activeFilter)
    : []

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

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Activity list */}
      {!isLoading && filtered.length > 0 && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-800/50">
          {filtered.map((act) => (
            <Link
              key={act.id}
              href={`/activities/${act.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              {act.sport && KNOWN_SPORTS.includes(act.sport as SportType) ? (
                <SportBadge sport={act.sport as SportType} showLabel={false} />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {act.sport
                    ? act.sport.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                    : 'Activity'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {act.start_time ? formatLongDate(act.start_time) : '—'}
                  {act.avg_hr != null && ` · ${act.avg_hr} bpm`}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                {act.distance_m != null && (
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatDistance(act.distance_m)}
                  </p>
                )}
                {act.duration_s != null && <p>{formatDuration(act.duration_s)}</p>}
                {act.elevation_gain_m != null && act.elevation_gain_m > 0 && (
                  <p>↑ {Math.round(act.elevation_gain_m)} m</p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0 ml-1" />
            </Link>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800">
            <Mountain className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
              {activeFilter === 'all' ? 'No activities yet' : `No ${activeFilter.replace(/_/g, ' ')} activities`}
            </h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
              {activeFilter === 'all'
                ? 'Sync Garmin or import Apple Health to get started'
                : 'Try selecting a different sport filter'}
            </p>
          </div>
          {activeFilter === 'all' && (
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
          )}
        </div>
      )}
    </div>
  )
}
