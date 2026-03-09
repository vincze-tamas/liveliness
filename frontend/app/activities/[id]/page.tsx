'use client'

import { useState } from 'react'
import { ArrowLeft, Bot, Clock, Loader2, Map, Mountain, Heart, Zap, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SportBadge, type SportType } from '@/components/activities/SportBadge'
import { apiFetch } from '@/lib/api'
import { formatDuration, formatDistance, formatPace, formatLongDate } from '@/lib/format'
import { Button } from '@/components/ui/button'

interface ActivityRead {
  id: number
  sport: string | null
  start_time: string | null
  duration_s: number | null
  distance_m: number | null
  elevation_gain_m: number | null
  avg_hr: number | null
  max_hr: number | null
  avg_pace_s_per_km: number | null
  avg_speed_kmh: number | null
  avg_power_w: number | null
  normalized_power_w: number | null
  tss: number | null
  ski_vertical_m: number | null
  ski_runs: number | null
  notes: string | null
}

const KNOWN_SPORTS: SportType[] = ['trail_run', 'mtb', 'road_bike', 'ski_alpine', 'inline_skate', 'gym']

const sportHeaderColor: Record<SportType, string> = {
  trail_run: 'bg-teal-600',
  mtb: 'bg-amber-600',
  road_bike: 'bg-indigo-500',
  ski_alpine: 'bg-sky-500',
  inline_skate: 'bg-pink-500',
  gym: 'bg-purple-500',
}

interface Streams {
  time_s?: number[]
  hr?: (number | null)[]
  power?: (number | null)[]
  altitude?: (number | null)[]
  pace_s_per_km?: (number | null)[]
}

interface Props {
  params: { id: string }
}

export default function ActivityDetailPage({ params }: Props) {
  const [debrief, setDebrief] = useState<string | null>(null)
  const [debriefLoading, setDebriefLoading] = useState(false)
  const [debriefError, setDebriefError] = useState<string | null>(null)

  const { data: activity, isLoading, isError } = useQuery<ActivityRead>({
    queryKey: ['activity', params.id],
    queryFn: () => apiFetch<ActivityRead>(`/api/activities/${params.id}`),
  })

  const { data: streams } = useQuery<Streams>({
    queryKey: ['activity-streams', params.id],
    queryFn: () => apiFetch<Streams>(`/api/statistics/activity/${params.id}/streams`),
    enabled: !!activity,
  })

  // Build a flat array of {t, hr, power, altitude, pace} for Recharts
  const chartData = (() => {
    if (!streams?.time_s?.length) return null
    return streams.time_s.map((t, i) => ({
      t: Math.round(t),
      hr: streams.hr?.[i] ?? null,
      power: streams.power?.[i] ?? null,
      altitude: streams.altitude?.[i] != null ? Math.round(streams.altitude[i]!) : null,
      pace: streams.pace_s_per_km?.[i] != null
        ? Math.round(streams.pace_s_per_km![i]!)
        : null,
    }))
  })()

  const fmtElapsed = (s: number) => {
    const m = Math.floor(s / 60)
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
  }

  const fmtPaceAxis = (s: number) => {
    const mm = Math.floor(s / 60)
    const ss = String(Math.round(s % 60)).padStart(2, '0')
    return `${mm}:${ss}`
  }

  async function handleDebrief() {
    setDebriefLoading(true)
    setDebriefError(null)
    try {
      const data = await apiFetch<{ debrief: string }>(`/api/coach/debrief/${params.id}`, {
        method: 'POST',
      })
      setDebrief(data.debrief)
    } catch (err) {
      setDebriefError(
        err instanceof Error && err.message.includes('503')
          ? 'AI coaching unavailable — check ANTHROPIC_API_KEY.'
          : 'Failed to generate debrief. Try again.'
      )
    } finally {
      setDebriefLoading(false)
    }
  }

  const sport = activity?.sport
  const isKnownSport = sport && KNOWN_SPORTS.includes(sport as SportType)
  const headerColor = isKnownSport ? sportHeaderColor[sport as SportType] : 'bg-slate-600'
  const sportLabel = sport
    ? sport.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Activity'

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <Link
        href="/activities"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Activities
      </Link>

      {/* Header */}
      {isLoading && <Skeleton className="h-36 w-full rounded-2xl" />}
      {isError && (
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-5 text-center text-sm text-slate-500">
          Activity not found
        </div>
      )}
      {activity && (
        <div className={`rounded-2xl ${headerColor} text-white p-5 space-y-3`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{sportLabel}</h1>
              <p className="text-white/80 text-sm">
                {activity.start_time ? formatLongDate(activity.start_time) : '—'}
              </p>
            </div>
            {isKnownSport && (
              <div className="ml-auto">
                <SportBadge sport={sport as SportType} size="sm" className="bg-white/20 text-white" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="text-center">
              <div className="flex items-center justify-center text-white/70 mb-1">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <p className="text-xl font-bold">
                {activity.duration_s ? formatDuration(activity.duration_s) : '—'}
              </p>
              <p className="text-xs text-white/70">Duration</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center text-white/70 mb-1">
                <Map className="w-3.5 h-3.5" />
              </div>
              <p className="text-xl font-bold">
                {activity.distance_m ? formatDistance(activity.distance_m) : '—'}
              </p>
              <p className="text-xs text-white/70">Distance</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center text-white/70 mb-1">
                <Mountain className="w-3.5 h-3.5" />
              </div>
              <p className="text-xl font-bold">
                {activity.elevation_gain_m ? `${Math.round(activity.elevation_gain_m)} m` : '—'}
              </p>
              <p className="text-xs text-white/70">Elevation</p>
            </div>
          </div>
        </div>
      )}

      {/* Details Grid */}
      {activity && (() => {
        const hasMetrics = [
          activity.avg_hr, activity.max_hr, activity.avg_pace_s_per_km,
          activity.avg_speed_kmh, activity.avg_power_w, activity.normalized_power_w,
          activity.tss, activity.ski_vertical_m, activity.ski_runs, activity.notes,
        ].some((v) => v != null)
        if (!hasMetrics) return null
        return (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {activity.avg_hr != null && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <Heart className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{activity.avg_hr}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Avg HR (bpm)</p>
                  </div>
                </div>
              )}
              {activity.max_hr != null && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <Heart className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{activity.max_hr}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Max HR (bpm)</p>
                  </div>
                </div>
              )}
              {activity.avg_pace_s_per_km != null && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <TrendingUp className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatPace(activity.avg_pace_s_per_km)}/km
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Avg Pace</p>
                  </div>
                </div>
              )}
              {activity.avg_speed_kmh != null && activity.avg_pace_s_per_km == null && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <TrendingUp className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {activity.avg_speed_kmh.toFixed(1)} km/h
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Avg Speed</p>
                  </div>
                </div>
              )}
              {activity.avg_power_w != null && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {Math.round(activity.avg_power_w)} W
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Avg Power</p>
                  </div>
                </div>
              )}
              {activity.normalized_power_w != null && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <Zap className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {Math.round(activity.normalized_power_w)} W
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Norm Power</p>
                  </div>
                </div>
              )}
              {activity.tss != null && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <TrendingUp className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {Math.round(activity.tss)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">TSS</p>
                  </div>
                </div>
              )}
              {activity.ski_vertical_m != null && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <Mountain className="w-4 h-4 text-sky-500 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {Math.round(activity.ski_vertical_m)} m
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Vertical</p>
                  </div>
                </div>
              )}
              {activity.ski_runs != null && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                  <Mountain className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {activity.ski_runs}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Runs</p>
                  </div>
                </div>
              )}
            </div>

            {activity.notes && (
              <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{activity.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        )
      })()}

      {/* AI Debrief */}
      {activity && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <CardTitle>AI Debrief</CardTitle>
            </div>
            {!debrief && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDebrief}
                disabled={debriefLoading}
              >
                {debriefLoading ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analysing…</>
                ) : (
                  'Generate'
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {debrief ? (
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {debrief}
              </p>
            ) : debriefError ? (
              <p className="text-sm text-red-500">{debriefError}</p>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Press Generate to get an AI-powered analysis of this session.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stream Charts */}
      {activity && chartData && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Charts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Heart Rate */}
            {chartData.some((d) => d.hr != null) && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-400" /> Heart Rate (bpm)
                </p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="t" tickFormatter={fmtElapsed} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} width={32} domain={['auto', 'auto']} />
                    <Tooltip labelFormatter={(v) => fmtElapsed(v as number)} formatter={(v: unknown) => [`${v} bpm`, 'HR']} />
                    <Line type="monotone" dataKey="hr" dot={false} stroke="#f43f5e" strokeWidth={1.5} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Power */}
            {chartData.some((d) => d.power != null) && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Power (W)
                </p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="t" tickFormatter={fmtElapsed} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} width={36} domain={['auto', 'auto']} />
                    <Tooltip labelFormatter={(v) => fmtElapsed(v as number)} formatter={(v: unknown) => [`${v} W`, 'Power']} />
                    <Line type="monotone" dataKey="power" dot={false} stroke="#f59e0b" strokeWidth={1.5} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pace */}
            {chartData.some((d) => d.pace != null) && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-500" /> Pace (min/km)
                </p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="t" tickFormatter={fmtElapsed} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} width={36} tickFormatter={fmtPaceAxis} domain={['auto', 'auto']} reversed />
                    <Tooltip labelFormatter={(v) => fmtElapsed(v as number)} formatter={(v: unknown) => [fmtPaceAxis(v as number), 'Pace']} />
                    <Line type="monotone" dataKey="pace" dot={false} stroke="#14b8a6" strokeWidth={1.5} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Elevation */}
            {chartData.some((d) => d.altitude != null) && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Mountain className="w-3.5 h-3.5 text-slate-400" /> Elevation (m)
                </p>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="t" tickFormatter={fmtElapsed} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} width={36} domain={['auto', 'auto']} />
                    <Tooltip labelFormatter={(v) => fmtElapsed(v as number)} formatter={(v: unknown) => [`${v} m`, 'Altitude']} />
                    <Line type="monotone" dataKey="altitude" dot={false} stroke="#94a3b8" strokeWidth={1.5} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="h-2" />
    </div>
  )
}
