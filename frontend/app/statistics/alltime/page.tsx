'use client'

import { ArrowLeft, Mountain, Clock, Map, Activity, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SportBadge, type SportType } from '@/components/activities/SportBadge'
import { apiFetch } from '@/lib/api'
import { formatLongDate } from '@/lib/format'

interface SportStats {
  count: number
  distance_km: number
  elevation_m: number
  duration_h: number
}

interface AllTimeStats {
  total_activities: number
  total_distance_km: number
  total_elevation_m: number
  total_duration_h: number
  sport_stats: Record<string, SportStats>
  first_activity_date: string | null
  last_activity_date: string | null
  longest_activity_h: number
  most_elevation_m: number
}

const KNOWN_SPORTS: SportType[] = ['trail_run', 'mtb', 'road_bike', 'ski_alpine', 'inline_skate', 'gym']

export default function AllTimeStatsPage() {
  const { data: stats, isLoading } = useQuery<AllTimeStats>({
    queryKey: ['alltime-stats'],
    queryFn: () => apiFetch<AllTimeStats>('/api/statistics/alltime'),
  })

  const hasData = stats && stats.total_activities > 0

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <Link
        href="/statistics"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Statistics
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All-Time Stats</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Your complete training history
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      )}

      {!isLoading && !hasData && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800">
            <Trophy className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No activities yet — sync to see your records
          </p>
        </div>
      )}

      {!isLoading && hasData && stats && (
        <>
          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Activities</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.total_activities}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Map className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Distance</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.total_distance_km.toFixed(0)}{' '}
                    <span className="text-base font-normal text-slate-500">km</span>
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Mountain className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Elevation</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.total_elevation_m.toLocaleString()}{' '}
                    <span className="text-base font-normal text-slate-500">m</span>
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Hours</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.total_duration_h.toFixed(0)}{' '}
                    <span className="text-base font-normal text-slate-500">h</span>
                  </p>
                </div>
              </div>

              {(stats.first_activity_date || stats.last_activity_date) && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs text-slate-400">
                  {stats.first_activity_date && (
                    <span>Since {formatLongDate(stats.first_activity_date)}</span>
                  )}
                  {stats.last_activity_date && (
                    <span>Last: {formatLongDate(stats.last_activity_date)}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Records */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Longest Activity</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {stats.longest_activity_h.toFixed(1)}{' '}
                    <span className="text-sm font-normal text-slate-500">h</span>
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Most Elevation</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {stats.most_elevation_m.toLocaleString()}{' '}
                    <span className="text-sm font-normal text-slate-500">m</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-sport breakdown */}
          {Object.keys(stats.sport_stats).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>By Sport</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {Object.entries(stats.sport_stats)
                    .sort(([, a], [, b]) => b.distance_km - a.distance_km)
                    .map(([sport, s]) => (
                      <div key={sport} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        {KNOWN_SPORTS.includes(sport as SportType) ? (
                          <SportBadge sport={sport as SportType} size="sm" />
                        ) : (
                          <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">
                            {sport}
                          </span>
                        )}
                        <div className="flex-1 grid grid-cols-3 gap-1 text-xs text-right">
                          <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{s.count}</p>
                            <p className="text-slate-400">acts</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{s.distance_km.toFixed(0)}</p>
                            <p className="text-slate-400">km</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{s.duration_h.toFixed(0)}</p>
                            <p className="text-slate-400">h</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="h-2" />
    </div>
  )
}
