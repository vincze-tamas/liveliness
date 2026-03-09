'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Target,
  Sparkles,
  Plus,
  Calendar,
  ChevronRight,
  X,
  Mountain,
  Bike,
  Snowflake,
  Zap,
  Dumbbell,
  Footprints,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RaceGoal {
  id: number
  name: string
  sport: string
  race_date: string
  distance_km: number | null
  target_time_s: number | null
  notes: string | null
  is_active: boolean
}

interface TrainingPlan {
  id: number
  week_start: string
  phase: string | null
  goal_description: string | null
  planned_tss: number | null
  planned_hours: number | null
  sessions: string | null  // JSON string
}

interface Session {
  day: string
  sport: string
  session_type: string
  target_duration_min: number
  target_tss: number
  description: string
  is_rest: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const PHASES = ['base', 'build', 'peak', 'taper', 'race', 'recovery', 'off'] as const

const PHASE_STYLES: Record<string, string> = {
  base:     'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  build:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  peak:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  taper:    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  race:     'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  recovery: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  off:      'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

const SPORT_OPTIONS = [
  { value: 'trail_run',   label: 'Trail Running' },
  { value: 'road_bike',   label: 'Road Biking' },
  { value: 'mtb',         label: 'Mountain Biking' },
  { value: 'ski_alpine',  label: 'Alpine Skiing' },
  { value: 'inline_skate',label: 'Inline Skating' },
]

const SPORT_ICON: Record<string, React.ReactNode> = {
  trail_run:    <Mountain className="w-4 h-4" />,
  road_bike:    <Bike className="w-4 h-4" />,
  mtb:          <Bike className="w-4 h-4" />,
  ski_alpine:   <Snowflake className="w-4 h-4" />,
  inline_skate: <Zap className="w-4 h-4" />,
  gym:          <Dumbbell className="w-4 h-4" />,
  rest:         <Footprints className="w-4 h-4" />,
}

const SPORT_COLOUR: Record<string, string> = {
  trail_run:    'text-teal-600 dark:text-teal-400',
  road_bike:    'text-indigo-600 dark:text-indigo-400',
  mtb:          'text-amber-600 dark:text-amber-400',
  ski_alpine:   'text-sky-600 dark:text-sky-400',
  inline_skate: 'text-pink-600 dark:text-pink-400',
  gym:          'text-violet-600 dark:text-violet-400',
  rest:         'text-slate-400',
}

const SESSION_TYPE_LABEL: Record<string, string> = {
  rest:       'Rest',
  easy:       'Easy',
  threshold:  'Threshold',
  intervals:  'Intervals',
  long:       'Long',
  weights:    'Weights',
  recovery:   'Recovery',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtTargetTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function weekRangeLabel(): string {
  const today = new Date()
  const dow = today.getDay()
  const mon = new Date(today)
  mon.setDate(today.getDate() - ((dow + 6) % 7))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(mon)} – ${fmt(sun)}`
}

function parseSessions(json: string | null): Session[] {
  if (!json) return []
  try { return JSON.parse(json) as Session[] } catch { return [] }
}

// ---------------------------------------------------------------------------
// Goal Form
// ---------------------------------------------------------------------------

interface GoalFormProps {
  onSaved: () => void
  onCancel: () => void
}

function GoalForm({ onSaved, onCancel }: GoalFormProps) {
  const [name, setName] = useState('')
  const [sport, setSport] = useState('trail_run')
  const [raceDate, setRaceDate] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [targetTime, setTargetTime] = useState('')   // hh:mm:ss or mm:ss
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (body: object) =>
      apiFetch<RaceGoal>('/api/training/goals', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-goals'] })
      onSaved()
    },
    onError: (e: Error) => setError(e.message),
  })

  function parseTargetTime(raw: string): number | null {
    const parts = raw.trim().split(':').map(Number)
    if (parts.some(isNaN)) return null
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Goal name is required'); return }
    if (!raceDate) { setError('Race date is required'); return }

    const target_time_s = targetTime ? parseTargetTime(targetTime) : null
    if (targetTime && target_time_s === null) {
      setError('Target time must be hh:mm:ss or mm:ss')
      return
    }

    mutation.mutate({
      name: name.trim(),
      sport,
      race_date: raceDate,
      distance_km: distanceKm ? parseFloat(distanceKm) : null,
      target_time_s,
      notes: notes.trim() || null,
      is_active: true,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="goal-name" className="text-xs">Goal name *</Label>
          <Input
            id="goal-name"
            placeholder="e.g. UTMB 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="goal-sport" className="text-xs">Primary sport *</Label>
          <Select
            id="goal-sport"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
          >
            {SPORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="goal-date" className="text-xs">Race date *</Label>
          <Input
            id="goal-date"
            type="date"
            value={raceDate}
            onChange={(e) => setRaceDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="goal-dist" className="text-xs">Distance (km)</Label>
          <Input
            id="goal-dist"
            type="number"
            min="0"
            step="0.1"
            placeholder="e.g. 42.2"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="goal-time" className="text-xs">Target time (hh:mm:ss)</Label>
          <Input
            id="goal-time"
            placeholder="e.g. 4:30:00"
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="goal-notes" className="text-xs">Notes</Label>
          <Input
            id="goal-notes"
            placeholder="optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </p>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save Goal'}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TrainingPage() {
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const qc = useQueryClient()

  const { data: goals, isLoading: goalsLoading } = useQuery<RaceGoal[]>({
    queryKey: ['training-goals'],
    queryFn: () => apiFetch<RaceGoal[]>('/api/training/goals'),
  })

  const { data: plan, isLoading: planLoading } = useQuery<TrainingPlan>({
    queryKey: ['training-plan-current'],
    queryFn: () => apiFetch<TrainingPlan>('/api/training/plans/current'),
    retry: false,  // 404 = no plan yet, that's fine
  })

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<TrainingPlan>('/api/training/plans/generate', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-plan-current'] })
      setGenerateError(null)
    },
    onError: (e: Error) => setGenerateError(e.message),
  })

  const deleteGoalMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/api/training/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-goals'] }),
  })

  const activeGoals = goals?.filter((g) => g.is_active) ?? []
  const nextGoal = activeGoals.sort(
    (a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime()
  )[0]

  const currentPhase = plan?.phase ?? null
  const sessions = parseSessions(plan?.sessions ?? null)

  // Map sessions by day for the calendar grid
  const sessionByDay: Record<string, Session> = {}
  for (const s of sessions) sessionByDay[s.day] = s

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Training</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Your personalised training plan
        </p>
      </div>

      {/* ── Race Goal ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-600" />
            Race Goal
          </CardTitle>
          {!showGoalForm && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => setShowGoalForm(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Goal
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showGoalForm ? (
            <GoalForm
              onSaved={() => setShowGoalForm(false)}
              onCancel={() => setShowGoalForm(false)}
            />
          ) : goalsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : nextGoal ? (
            <div>
              {/* Primary goal */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{nextGoal.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {new Date(nextGoal.race_date).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                    {nextGoal.distance_km && ` · ${nextGoal.distance_km} km`}
                    {nextGoal.target_time_s && ` · Target ${fmtTargetTime(nextGoal.target_time_s)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-teal-600 dark:text-teal-400 tabular-nums">
                    {daysUntil(nextGoal.race_date)}d
                  </span>
                  <button
                    onClick={() => deleteGoalMutation.mutate(nextGoal.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    aria-label="Delete goal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Other goals */}
              {activeGoals.length > 1 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-3">
                  {activeGoals.slice(1).map((g) => (
                    <div key={g.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">{g.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {new Date(g.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                        <button
                          onClick={() => deleteGoalMutation.mutate(g.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          aria-label="Delete goal"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No race goal set — add one to enable periodized planning.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Current Phase ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Current Phase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {PHASES.map((phase) => (
              <span
                key={phase}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium capitalize transition-all',
                  currentPhase === phase
                    ? PHASE_STYLES[phase]
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                )}
              >
                {phase}
              </span>
            ))}
          </div>
          {!currentPhase && (
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Generate a plan to assign your training phase.
            </p>
          )}
          {plan?.planned_tss && plan?.planned_hours && (
            <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-xs text-slate-400">Target TSS</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {plan.planned_tss}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Planned hours</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {plan.planned_hours} h
                </p>
              </div>
              {plan.goal_description && (
                <div className="ml-auto max-w-[160px]">
                  <p className="text-xs text-slate-400 text-right">Goal</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-right truncate">
                    {plan.goal_description}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Weekly Calendar ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            This Week
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {weekRangeLabel()}
            </span>
            {plan && (
              <Link
                href="/training/week"
                className="text-xs text-teal-600 dark:text-teal-400 flex items-center hover:underline"
              >
                Details <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {planLoading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_DAYS.map((d) => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-400">{d}</span>
                  <Skeleton className="w-full aspect-square rounded-xl" />
                </div>
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_DAYS.map((day) => {
                const s = sessionByDay[day]
                const isToday =
                  day ===
                  WEEK_DAYS[
                    ((new Date().getDay() + 6) % 7)  // Mon=0
                  ]
                return (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isToday
                          ? 'text-teal-600 dark:text-teal-400'
                          : 'text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {day}
                    </span>
                    <div
                      className={cn(
                        'w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 px-0.5',
                        isToday
                          ? 'ring-1 ring-teal-200 dark:ring-teal-800 bg-teal-50 dark:bg-teal-900/20'
                          : s?.is_rest
                          ? 'bg-slate-50 dark:bg-slate-700/30'
                          : 'bg-slate-50 dark:bg-slate-700/50',
                      )}
                      title={s?.description}
                    >
                      {s && !s.is_rest ? (
                        <span className={cn('', SPORT_COLOUR[s.sport] ?? 'text-slate-400')}>
                          {SPORT_ICON[s.sport] ?? <Footprints className="w-3.5 h-3.5" />}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                      )}
                      {s && !s.is_rest && (
                        <span className="text-[9px] leading-none text-slate-400 dark:text-slate-500">
                          {s.target_duration_min}m
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEK_DAYS.map((day) => {
                  const isToday =
                    day === WEEK_DAYS[((new Date().getDay() + 6) % 7)]
                  return (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          isToday
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-slate-500 dark:text-slate-400'
                        )}
                      >
                        {day}
                      </span>
                      <div
                        className={cn(
                          'w-full aspect-square rounded-xl flex items-center justify-center',
                          isToday
                            ? 'bg-teal-50 dark:bg-teal-900/20 ring-1 ring-teal-200 dark:ring-teal-800'
                            : 'bg-slate-50 dark:bg-slate-700/50'
                        )}
                      >
                        <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center">
                No plan yet — generate one to populate your week.
              </p>
            </>
          )}

          {generateError && (
            <p className="mt-3 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />{generateError}
            </p>
          )}

          <div className="mt-4 flex justify-center">
            <Button
              className="gap-2"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              <Sparkles className="w-4 h-4" />
              {generateMutation.isPending
                ? 'Generating…'
                : plan
                ? 'Regenerate this week'
                : "Generate this week's plan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="h-2" />
    </div>
  )
}
