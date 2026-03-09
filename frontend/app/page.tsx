import {
  Heart,
  Activity,
  Weight,
  Moon,
  TrendingUp,
  Clock,
  Map,
  Mountain,
  ChevronRight,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/StatCard'

export default function DashboardPage() {
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

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
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Activity className="w-4 h-4" />}
              label="HRV"
              value="—"
              unit="ms"
              trend="neutral"
            />
            <StatCard
              icon={<Heart className="w-4 h-4" />}
              label="Resting HR"
              value="—"
              unit="bpm"
              trend="neutral"
            />
            <StatCard
              icon={<Weight className="w-4 h-4" />}
              label="Weight"
              value="—"
              unit="kg"
              trend="neutral"
            />
            <StatCard
              icon={<Moon className="w-4 h-4" />}
              label="Sleep"
              value="—"
              unit="h"
              trend="neutral"
            />
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 text-center">
            Sync Garmin or Apple Health to see your data
          </p>
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
                —
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                CTL
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Fitness
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">—</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ATL
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Fatigue
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-500">—</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                TSB
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Form</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500 text-center">
            Training load metrics will appear after syncing activities
          </p>
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
              value="0"
              unit="h"
            />
            <StatCard
              icon={<Map className="w-4 h-4" />}
              label="Distance"
              value="0"
              unit="km"
            />
            <StatCard
              icon={<Mountain className="w-4 h-4" />}
              label="Elevation"
              value="0"
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
            <Button size="sm">
              Generate Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Bottom spacer for last card */}
      <div className="h-2" />
    </div>
  )
}
