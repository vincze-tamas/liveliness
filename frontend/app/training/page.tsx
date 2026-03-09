import { Sparkles, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const phases = ['Base', 'Build', 'Peak', 'Race', 'Recovery'] as const
type Phase = (typeof phases)[number]

const currentPhase: Phase | null = null

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const phaseColors: Record<Phase, string> = {
  Base: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  Build: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Peak: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Race: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  Recovery: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

export default function TrainingPage() {
  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Training
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Your personalised training plan
        </p>
      </div>

      {/* Phase Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>Current Phase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {phases.map((phase) => (
                <span
                  key={phase}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-all',
                    currentPhase === phase
                      ? phaseColors[phase]
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                  )}
                >
                  {phase}
                </span>
              ))}
            </div>
          </div>
          {!currentPhase && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Generate a plan to assign your training phase
            </p>
          )}
        </CardContent>
      </Card>

      {/* Weekly Plan Calendar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>This Week</CardTitle>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            9 – 15 Mar
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((day, i) => (
              <div key={day} className="flex flex-col items-center gap-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {day}
                </span>
                <div
                  className={cn(
                    'w-full aspect-square rounded-xl flex items-center justify-center',
                    i === 0
                      ? 'bg-teal-50 dark:bg-teal-900/20 ring-1 ring-teal-200 dark:ring-teal-800'
                      : 'bg-slate-50 dark:bg-slate-700/50'
                  )}
                >
                  <span className="text-xs text-slate-300 dark:text-slate-600">
                    —
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center">
            No plan yet — generate one to populate your week
          </p>
          <div className="mt-4 flex justify-center">
            <Button className="gap-2">
              <Sparkles className="w-4 h-4" />
              Generate this week&apos;s plan
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="h-2" />
    </div>
  )
}
