'use client'

import {
  Heart,
  Activity,
  Moon,
  TrendingUp,
  Clock,
  Map,
  Mountain,
  ChevronRight,
  RefreshCw,
  Smartphone,
  Scale,
} from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/dashboard/StatCard'
import { SportBadge, type SportType } from '@/components/activities/SportBadge'
import { apiFetch } from '@/lib/api'
import { formatDuration, formatDistance, formatLongDate } from '@/lib/format'

interface HealthMetrics {
  hrv_ms: number | null
  resting_hr: number | null
  weight_kg: number | null
  sleep_hours: number | null
}

interface PmcPoint {
  date: string
  tss: number
  ctl: number
  atl: number
  tsb: number
}

interface WeekSummary {
  week_start: string
  distance_km: number
  elevation_m: number
  duration_h: number
  tss: number
  activity_count: number
}

interface ActivityRead {
  id: number
  sport: string | null
  start_time: string | null
  duration_s: number | null
  distance_m: number | null
}

const KNOWN_SPORTS: SportType[] = ['trail_run', 'mtb', 'road_bike', 'ski_alpine', 'inline_skate', 'gym']

export default function DashboardPage() {
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const { data: todayMetrics, isLoading: metricsLoading } = useQuery<HealthMetrics>({
    queryKey: ['health-metrics-today'],
    queryFn: () => apiFetch<HealthMetrics>('/api/health/metrics/today'),
    retry: false,
  })

  const { data: pmc } = useQuery<PmcPoint[]>({
    queryKey: ['pmc-7'],
    queryFn: () => apiFetch<PmcPoint[]>('/api/statistics/pmc?days=7'),
  })

  const { data: weeklyStats } = useQuery<WeekSummary[]>({
    queryKey: ['weekly-stats-2'],
    queryFn: () => apiFetch<WeekSummary[]>('/api/statistics/weekly?weeks=2'),
  })

  const { data: recentActivities, isLoading: activitiesLoading } = useQuery<ActivityRead[]>({
    queryKey: ['activities-recent'],
    queryFn: () => apiFetch<ActivityRead[]>('/api/activities?limit=5'),
  })

  const latestPmc = pmc && pmc.length > 0 ? pmc[pmc.length - 1] : null
  const currentWeek = weeklyStats && weeklyStats.length > 0
    ? weeklyStats[weeklyStats.length - 1]
    : null
  const hasActivities = recentActivities && recentActivities.length > 0

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Good morning 👋
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {formattedDate}
        </p>
      </div>

      {/* Today's Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Activity className="w-4 h-4" />}
                  label="HRV"
                  value={todayMetrics?.hrv_ms != null ? Math.round(todayMetrics.hrv_ms) : '—'}
                  unit="ms"
                  trend="neutral"
                />
                <StatCard
                  icon={<Heart className="w-4 h-4" />}
                  label="Resting HR"
                  value={todayMetrics?.resting_hr ?? '—'}
                  unit="bpm"
                  trend="neutral"
                />
                <StatCard
                  icon={<Scale className="w-4 h-4" />}
                  label="Weight"
                  value={todayMetrics?.weight_kg != null ? todayMetrics.weight_kg.toFixed(1) : '—'}
                  unit="kg"
                  trend="neutral"
                />
                <StatCard
                  icon={<Moon className="w-4 h-4" />}
                  label="Sleep"
                  value={todayMetrics?.sleep_hours != null ? todayMetrics.sleep_hours.toFixed(1) : '—'}
                  unit="h"
                  trend="neutral"
                />
              </div>
              {!todayMetrics && (
                <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 text-center">
                  Sync Garmin or Apple Health to see your data
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Training Load */}
      <Card>
        <CardHeader>
          <CardTitle>Training Load</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {latestPmc ? Math.round(latestPmc.ctl) : '—'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">CTL</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Fitness</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">
                {latestPmc ? Math.round(latestPmc.atl) : '—'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ATL</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Fatigue</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${
                latestPmc
                  ? latestPmc.tsb >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  : 'text-indigo-500'
              }`}>
                {latestPmc ? Math.round(latestPmc.tsb) : '—'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">TSB</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Form</p>
            </div>
          </div>
          {!latestPmc && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 text-center">
              Training load metrics will appear after syncing activities
            </p>
          )}
        </CardContent>
      </Card>

      {/* This Week */}
      <Card>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="Hours"
              value={currentWeek ? currentWeek.duration_h.toFixed(1) : '0'}
              unit="h"
            />
            <StatCard
              icon={<Map className="w-4 h-4" />}
              label="Distance"
              value={currentWeek ? currentWeek.distance_km.toFixed(1) : '0'}
              unit="km"
            />
            <StatCard
              icon={<Mountain className="w-4 h-4" />}
              label="Elevation"
              value={currentWeek ? currentWeek.elevation_m : '0'}
              unit="m"
            />
          </div>
        </CardContent>
      </Card>

      {/* Next Session */}
      <Card>
        <CardHeader>
          <CardTitle>Next Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700">
              <TrendingUp className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              No plan generated yet
            </p>
            <Link href="/training">
              <Button size="sm">Generate Plan</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Activities</CardTitle>
          {hasActivities && (
            <Link
              href="/activities"
              className="text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center gap-0.5"
            >
              See all <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {activitiesLoading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          )}
          {!activitiesLoading && hasActivities && (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 -mx-6 px-6">
              {recentActivities!.map((act) => (
                <Link
                  key={act.id}
                  href={`/activities/${act.id}`}
                  className="flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 -mx-6 px-6 transition-colors"
                >
                  {act.sport && KNOWN_SPORTS.includes(act.sport as SportType) ? (
                    <SportBadge sport={act.sport as SportType} showLabel={false} size="sm" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {act.sport
                        ? act.sport.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                        : 'Activity'}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {act.start_time ? formatLongDate(act.start_time) : ''}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    {act.distance_m != null && (
                      <p className="font-medium">{formatDistance(act.distance_m)}</p>
                    )}
                    {act.duration_s != null && <p>{formatDuration(act.duration_s)}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
          {!activitiesLoading && !hasActivities && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700">
                <Activity className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                No activities yet
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Sync with Garmin
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <Smartphone className="w-4 h-4" />
                  Import Apple Health
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="h-2" />
    </div>
  )
}
