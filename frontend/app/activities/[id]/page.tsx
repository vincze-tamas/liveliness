import { ArrowLeft, Mountain, Clock, Map, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ActivityDetailPageProps {
  params: { id: string }
}

const chartCards = [
  { title: 'Route Map' },
  { title: 'Elevation Profile' },
  { title: 'Heart Rate' },
  { title: 'Pace / Speed' },
  { title: 'HR Zones' },
]

export default function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      {/* Back Button */}
      <Link
        href="/activities"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Activities
      </Link>

      {/* Activity Header */}
      <div className="rounded-2xl bg-teal-600 text-white p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
            <Mountain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Activity #{params.id}</h1>
            <p className="text-teal-100 text-sm">Trail Run · 9 March 2026</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-teal-100 mb-1">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-bold">—</p>
            <p className="text-xs text-teal-100">Duration</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-teal-100 mb-1">
              <Map className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-bold">—</p>
            <p className="text-xs text-teal-100">Distance</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-teal-100 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <p className="text-xl font-bold">—</p>
            <p className="text-xs text-teal-100">Elevation</p>
          </div>
        </div>
      </div>

      {/* Chart Placeholder Cards */}
      {chartCards.map(({ title }) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Skeleton className="w-full h-40 rounded-xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Chart coming in Phase 3.5
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="h-2" />
    </div>
  )
}
