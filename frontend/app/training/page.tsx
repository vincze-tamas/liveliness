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
  Pencil,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  sessions: string | null
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

interface PmcPoint {
  date: string
  tss: number
  ctl: number
  atl: number
  tsb: number
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
  { value: 'trail_run',    label: 'Trail Running' },
  { value: 'road_bike',    label: 'Road Biking' },
  { value: 'mtb',          label: 'Mountain Biking' },
  { value: 'ski_alpine',   label: 'Alpine Skiing' },
  { value: 'inline_skate', label: 'Inline Skating' },
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

function isInPast(dateStr: string): boolean {
  return daysUntil(dateStr) < 0
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

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Goal Form (create + edit)
// ---------------------------------------------------------------------------

interface GoalFormProps {
  initial?: RaceGoal
  onSaved: () => void
  onCancel: () => void
}

function GoalForm({ initial, onSaved, onCancel }: GoalFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [sport, setSport] = useState(initial?.sport ?? 'trail_run')
  const [raceDate, setRaceDate] = useState(initial?.race_date ?? '')
  const [distanceKm, setDistanceKm] = useState(
    initial?.distance_km != null ? String(initial.distance_km) : ''
  )
  const [targetTime, setTargetTime] = useState(
    initial?.target_time_s != null ? fmtTargetTime(initial.target_time_s) : ''
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const qc = useQueryClient()
  const isEdit = !!initial

  const mutation = useMutation({
    mutationFn: (body: object) =>
      isEdit
        ? apiFetch<RaceGoal>(`/api/training/goals/${initial!.id}`, {
            method: 'PUT',
            body: JSON.stringify(body),
          })
        : apiFetch<RaceGoal>('/api/training/goals', {
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
          <select
            id="goal-sport"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="flex h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50"
          >
            {SPORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
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
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : isEdit ? 'Update Goal' : 'Save Goal'}
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Session detail modal (simple overlay, no Radix dep needed)
// ---------------------------------------------------------------------------

function SessionModal({ session, day, onClose }: { session: Session; day: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('', SPORT_COLOUR[session.sport] ?? 'text-slate-400')}>
              {SPORT_ICON[session.sport] ?? <Footprints className="w-4 h-4" />}
            </span>
            <h3 className="font-semibold text-slate-900 dark:text-white">{day}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
            {session.sport.replace(/_/g, ' ')}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 capitalize">
            {SESSION_TYPE_LABEL[session.session_type] ?? session.session_type}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
            <p className="text-xs text-slate-400 dark:text-slate-500">Duration</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{session.target_duration_min}<span className="text-xs font-normal ml-0.5">min</span></p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
            <p className="text-xs text-slate-400 dark:text-slate-500">Target TSS</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{session.target_tss}</p>
          </div>
        </div>

        {session.description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {session.description}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PMC mini-chart for Current Phase section
// ---------------------------------------------------------------------------

function PmcPhaseChart({ nextGoalDate }: { nextGoalDate: string | null }) {
  const today = new Date().toISOString().slice(0, 10)
  const daysToRace = nextGoalDate ? Math.max(daysUntil(nextGoalDate), 0) : 0
  const pmcDays = Math.min(Math.max(daysToRace + 30, 90), 365)

  const { data: pmc } = useQuery<PmcPoint[]>({
    queryKey: ['pmc-phase', pmcDays],
    queryFn: () => apiFetch<PmcPoint[]>(`/api/statistics/pmc?days=${pmcDays}`),
  })

  if (!pmc || pmc.length === 0) return null

  // Downsample for mobile: show every Nth point
  const step = Math.max(1, Math.floor(pmc.length / 60))
  const data = pmc.filter((_, i) => i % step === 0)

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
        PMC — road to race
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9 }}
            tickFormatter={(v: string) => v.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
            formatter={(v: number, name: string) => [Math.round(v), name.toUpperCase()]}
            labelFormatter={(l: string) => l}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {/* Reference line: today */}
          <ReferenceLine x={today} stroke="#94a3b8" strokeDasharray="4 2" label={{ value: 'Today', fontSize: 9, fill: '#94a3b8' }} />
          {/* Reference line: race day */}
          {nextGoalDate && nextGoalDate > today && (
            <ReferenceLine x={nextGoalDate} stroke="#f43f5e" strokeDasharray="4 2" label={{ value: 'Race', fontSize: 9, fill: '#f43f5e' }} />
          )}
          <Line type="monotone" dataKey="ctl" stroke="#14b8a6" strokeWidth={1.5} dot={false} name="CTL" />
          <Line type="monotone" dataKey="atl" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="ATL" />
          {/* TSB — emphasized: thicker, always on top */}
          <Line type="monotone" dataKey="tsb" stroke="#8b5cf6" strokeWidth={2.5} dot={false} name="TSB" />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        TSB (form) is most critical for race day — aim for +5 to +15 at start.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TrainingPage() {
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<RaceGoal | null>(null)
  const [showPastGoals, setShowPastGoals] = useState(false)
  const [selectedDaySession, setSelectedDaySession] = useState<{ day: string; session: Session } | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const qc = useQueryClient()

  const { data: goals, isLoading: goalsLoading } = useQuery<RaceGoal[]>({
    queryKey: ['training-goals'],
    queryFn: () => apiFetch<RaceGoal[]>('/api/training/goals'),
  })

  const { data: plan, isLoading: planLoading } = useQuery<TrainingPlan>({
    queryKey: ['training-plan-current'],
    queryFn: () => apiFetch<TrainingPlan>('/api/training/plans/current'),
    retry: false,
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

  const allGoals = goals ?? []
  const upcomingGoals = allGoals
    .filter((g) => g.is_active && !isInPast(g.race_date))
    .sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime())
  const pastGoals = allGoals
    .filter((g) => isInPast(g.race_date))
    .sort((a, b) => new Date(b.race_date).getTime() - new Date(a.race_date).getTime())

  const nextGoal = upcomingGoals[0] ?? null

  const currentPhase = plan?.phase ?? null
  const sessions = parseSessions(plan?.sessions ?? null)

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

      {/* ── Race Goals ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-600" />
            Race Goals
          </CardTitle>
          {!showGoalForm && !editingGoal && (
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
          {/* Add form */}
          {showGoalForm && (
            <GoalForm
              onSaved={() => setShowGoalForm(false)}
              onCancel={() => setShowGoalForm(false)}
            />
          )}

          {/* Edit form */}
          {editingGoal && (
            <GoalForm
              initial={editingGoal}
              onSaved={() => setEditingGoal(null)}
              onCancel={() => setEditingGoal(null)}
            />
          )}

          {!showGoalForm && !editingGoal && (
            <>
              {goalsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : upcomingGoals.length > 0 ? (
                <div className="space-y-2">
                  {upcomingGoals.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setEditingGoal(g)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('flex-shrink-0', SPORT_COLOUR[g.sport] ?? 'text-slate-400')}>
                              {SPORT_ICON[g.sport] ?? <Target className="w-3.5 h-3.5" />}
                            </span>
                            <p className="font-semibold text-slate-900 dark:text-white truncate">{g.name}</p>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-5">
                            {fmtDate(g.race_date)}
                            {g.distance_km && ` · ${g.distance_km} km`}
                            {g.target_time_s && ` · ${fmtTargetTime(g.target_time_s)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                            {daysUntil(g.race_date)}d
                          </span>
                          <Pencil className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-500 transition-colors" />
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteGoalMutation.mutate(g.id) }}
                            className="text-slate-300 hover:text-red-500 transition-colors p-0.5"
                            aria-label="Delete goal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  No upcoming race goals — add one to enable periodized planning.
                </p>
              )}

              {/* Past goals */}
              {pastGoals.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowPastGoals((v) => !v)}
                    className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showPastGoals && 'rotate-180')} />
                    Past goals ({pastGoals.length})
                  </button>
                  {showPastGoals && (
                    <div className="mt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-700 pt-2">
                      {pastGoals.map((g) => (
                        <div key={g.id} className="flex items-center justify-between text-sm px-1">
                          <span className="text-slate-500 dark:text-slate-400 truncate">{g.name}</span>
                          <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                            {new Date(g.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
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
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{plan.planned_tss}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Planned hours</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{plan.planned_hours} h</p>
              </div>
              {plan.goal_description && (
                <div className="ml-auto max-w-[160px]">
                  <p className="text-xs text-slate-400 text-right">Goal</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-right truncate">{plan.goal_description}</p>
                </div>
              )}
            </div>
          )}

          {/* PMC chart leading to next race */}
          <PmcPhaseChart nextGoalDate={nextGoal?.race_date ?? null} />
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
                  day === WEEK_DAYS[((new Date().getDay() + 6) % 7)]
                return (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isToday ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {day}
                    </span>
                    <button
                      onClick={() => s && !s.is_rest && setSelectedDaySession({ day, session: s })}
                      className={cn(
                        'w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 px-0.5 transition-colors',
                        isToday
                          ? 'ring-1 ring-teal-200 dark:ring-teal-800 bg-teal-50 dark:bg-teal-900/20'
                          : s?.is_rest
                          ? 'bg-slate-50 dark:bg-slate-700/30'
                          : 'bg-slate-50 dark:bg-slate-700/50',
                        s && !s.is_rest && 'hover:ring-1 hover:ring-teal-300 dark:hover:ring-teal-700 cursor-pointer',
                        (!s || s.is_rest) && 'cursor-default',
                      )}
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
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEK_DAYS.map((day) => {
                  const isToday = day === WEEK_DAYS[((new Date().getDay() + 6) % 7)]
                  return (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <span className={cn('text-xs font-medium', isToday ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400')}>
                        {day}
                      </span>
                      <div className={cn('w-full aspect-square rounded-xl flex items-center justify-center', isToday ? 'bg-teal-50 dark:bg-teal-900/20 ring-1 ring-teal-200 dark:ring-teal-800' : 'bg-slate-50 dark:bg-slate-700/50')}>
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

      {/* Session detail modal */}
      {selectedDaySession && (
        <SessionModal
          session={selectedDaySession.session}
          day={selectedDaySession.day}
          onClose={() => setSelectedDaySession(null)}
        />
      )}

      <div className="h-2" />
    </div>
  )
}
