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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { CHART_TOOLTIP_STYLE } from '@/lib/chart'
import { cn } from '@/lib/utils'

type Range = '3M' | '6M' | '12M'
const ranges: { value: Range; months: number }[] = [
  { value: '3M', months: 3 },
  { value: '6M', months: 6 },
  { value: '12M', months: 12 },
]

interface MonthSummary {
  month: string
  activity_count: number
  distance_km: number
  elevation_m: number
  duration_h: number
  tss: number
  sport_distance_km: Record<string, number>
}

const SPORT_COLORS: Record<string, string> = {
  trail_run: '#0d9488',
  mtb: '#d97706',
  road_bike: '#6366f1',
  ski_alpine: '#0ea5e9',
  inline_skate: '#ec4899',
  gym: '#8b5cf6',
  other: '#94a3b8',
}


export default function MonthlyStatsPage() {
  const [activeRange, setActiveRange] = useState<Range>('6M')
  const months = ranges.find((r) => r.value === activeRange)!.months

  const { data: allData, isLoading } = useQuery<MonthSummary[]>({
    queryKey: ['monthly-stats', 12],
    queryFn: () => apiFetch<MonthSummary[]>('/api/statistics/monthly?months=12'),
  })

  const data = allData ? allData.slice(-months) : []
  const chartData = data.map((m) => ({
    ...m,
    label: new Date(m.month + '-01T12:00:00').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
  }))
  const hasData = chartData.some((m) => m.activity_count > 0)

  // Sport distribution pie data (aggregate across visible months)
  const sportTotals: Record<string, number> = {}
  for (const m of data) {
    for (const [sport, km] of Object.entries(m.sport_distance_km)) {
      sportTotals[sport] = (sportTotals[sport] ?? 0) + km
    }
  }
  const pieData = Object.entries(sportTotals)
    .filter(([, km]) => km > 0)
    .map(([sport, km]) => ({
      name: sport.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value: Math.round(km * 10) / 10,
      color: SPORT_COLORS[sport] ?? SPORT_COLORS.other,
    }))
    .sort((a, b) => b.value - a.value)

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Monthly Stats</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Month-over-month training trends
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
            <CardHeader><CardTitle>Monthly Distance (km)</CardTitle></CardHeader>
            <CardContent>
              {!hasData ? renderEmpty() : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="distance_km" fill="#0d9488" radius={[4, 4, 0, 0]} name="Distance (km)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Monthly Elevation (m)</CardTitle></CardHeader>
            <CardContent>
              {!hasData ? renderEmpty() : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="elevation_m" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Elevation (m)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Monthly Training Hours</CardTitle></CardHeader>
            <CardContent>
              {!hasData ? renderEmpty() : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="duration_h" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Hours" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Monthly TSS</CardTitle></CardHeader>
            <CardContent>
              {!hasData ? renderEmpty() : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="tss" fill="#f59e0b" radius={[4, 4, 0, 0]} name="TSS" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Sport Distribution (km)</CardTitle></CardHeader>
            <CardContent>
              {pieData.length === 0 ? renderEmpty() : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={72}
                      innerRadius={36}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [`${v} km`]} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{value}</span>
                      )}
                    />
                  </PieChart>
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
