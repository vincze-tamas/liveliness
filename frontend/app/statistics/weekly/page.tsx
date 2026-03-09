'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

type Range = '4W' | '8W' | '12W'
const ranges: { value: Range; weeks: number }[] = [
  { value: '4W', weeks: 4 },
  { value: '8W', weeks: 8 },
  { value: '12W', weeks: 12 },
]

interface WeekSummary {
  week_start: string
  activity_count: number
  distance_km: number
  elevation_m: number
  duration_h: number
  tss: number
  avg_hrv: number | null
  avg_resting_hr: number | null
}

function shortWeek(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: 'none',
  borderRadius: 8,
  fontSize: 12,
  color: '#f1f5f9',
}

export default function WeeklyStatsPage() {
  const [activeRange, setActiveRange] = useState<Range>('8W')
  const weeks = ranges.find((r) => r.value === activeRange)!.weeks

  const { data: allData, isLoading } = useQuery<WeekSummary[]>({
    queryKey: ['weekly-stats', 12],
    queryFn: () => apiFetch<WeekSummary[]>('/api/statistics/weekly?weeks=12'),
  })

  const data = allData ? allData.slice(-weeks) : []
  const chartData = data.map((w) => ({ ...w, label: shortWeek(w.week_start) }))
  const hasData = chartData.some((w) => w.activity_count > 0)
  const hasHrv = chartData.some((w) => w.avg_hrv != null)

  const renderEmpty = () => (
    <div className="flex items-center justify-center h-36 rounded-xl bg-slate-50 dark:bg-slate-700/50">
      <p className="text-xs text-slate-400 dark:text-slate-500">No data for this period</p>
    </div>
  )

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <Link
        href="/statistics"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Statistics
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Weekly Stats</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Week-by-week training breakdown
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {ranges.map(({ value }) => (
            <button
              key={value}
              onClick={() => setActiveRange(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeRange === value
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)}
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader><CardTitle>Weekly Distance (km)</CardTitle></CardHeader>
            <CardContent>
              {!hasData ? renderEmpty() : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="distance_km" fill="#0d9488" radius={[4, 4, 0, 0]} name="Distance (km)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Elevation Gain (m)</CardTitle></CardHeader>
            <CardContent>
              {!hasData ? renderEmpty() : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="elevation_m" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Elevation (m)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Training Hours</CardTitle></CardHeader>
            <CardContent>
              {!hasData ? renderEmpty() : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="duration_h" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Training Stress Score (TSS)</CardTitle></CardHeader>
            <CardContent>
              {!hasData ? renderEmpty() : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="tss" fill="#f59e0b" radius={[4, 4, 0, 0]} name="TSS" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>HRV Trend (ms)</CardTitle></CardHeader>
            <CardContent>
              {!hasHrv ? renderEmpty() : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="avg_hrv"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#10b981' }}
                      connectNulls
                      name="Avg HRV (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="h-2" />
    </div>
  )
}
