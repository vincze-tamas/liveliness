'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Range = '4W' | '8W' | '12W'

const ranges: Range[] = ['4W', '8W', '12W']

const chartCards = [
  'Weekly Distance',
  'Elevation Gain',
  'Training Hours',
  'Training Stress Score (TSS)',
  'Zone Balance',
  'HRV Trend',
]

export default function WeeklyStatsPage() {
  const [activeRange, setActiveRange] = useState<Range>('8W')

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Weekly Stats
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Week-by-week training breakdown
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {ranges.map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                activeRange === range
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Placeholders */}
      <div className="grid grid-cols-1 gap-4">
        {chartCards.map((title) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Skeleton className="w-full h-36 rounded-xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Chart coming in Phase 3.5
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="h-2" />
    </div>
  )
}
