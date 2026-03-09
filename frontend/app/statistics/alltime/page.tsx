import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const chartCards = [
  {
    title: 'Activity Heatmap',
    description: 'All activities mapped by day of year',
    height: 'h-28',
  },
  {
    title: 'Cumulative Distance',
    description: 'Total distance over time across all sports',
    height: 'h-36',
  },
  {
    title: 'VO2max Estimate',
    description: 'Estimated aerobic capacity progression',
    height: 'h-36',
  },
  {
    title: 'Personal Records',
    description: 'Best times and distances for each sport',
    height: 'h-40',
  },
  {
    title: 'Fitness Radar',
    description: 'Multi-dimensional fitness profile across disciplines',
    height: 'h-44',
  },
]

export default function AllTimeStatsPage() {
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          All-Time Stats
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Your complete training history
        </p>
      </div>

      {/* Chart Placeholders */}
      <div className="grid grid-cols-1 gap-4">
        {chartCards.map(({ title, description, height }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {description}
              </p>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Skeleton className={`w-full ${height} rounded-xl`} />
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
