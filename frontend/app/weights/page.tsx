import { Plus, Dumbbell, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function WeightsPage() {
  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Weight Training
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Strength &amp; conditioning sessions
          </p>
        </div>
        <Button className="gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" />
          Log Session
        </Button>
      </div>

      {/* Planned Session */}
      <Card>
        <CardHeader>
          <CardTitle>Next Planned Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Sparkles className="w-6 h-6 text-purple-500" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              No plan generated
            </p>
            <Button variant="outline" size="sm">
              Generate Strength Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800">
              <Dumbbell className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              No sessions logged yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">
              Tap &ldquo;Log Session&rdquo; to record your first strength workout
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="h-2" />
    </div>
  )
}
