'use client'

import { useState } from 'react'
import { Plus, Dumbbell, Sparkles, Trash2, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExercisePrescription {
  exercise_name: string
  sets: number
  reps: string
  rest_s: number
  guidance: string
}

interface PlanResponse {
  phase: string
  prescriptions: ExercisePrescription[]
}

interface ExerciseRow {
  name: string
  sets: string
  reps: string
  weight_kg: string
  rpe: string
}

interface SessionData {
  id: number
  date: string
  session_type: string | null
  duration_min: number | null
  notes: string | null
  exercises_list: ExerciseRow[]
  wtss: number | null
}

interface ExerciseLibraryItem {
  name: string
  category: string
  primary_muscles: string[]
}

interface ExerciseHistoryEntry {
  session_id: number
  date: string
  session_type: string | null
  exercises: ExerciseRow[]
}

// ---------------------------------------------------------------------------
// Phase badge
// ---------------------------------------------------------------------------

const PHASE_STYLES: Record<string, string> = {
  base:     'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  build:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  peak:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  taper:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  race:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  recovery: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  off:      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

function PhaseBadge({ phase }: { phase: string }) {
  const style = PHASE_STYLES[phase] ?? PHASE_STYLES.base
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>{phase.charAt(0).toUpperCase() + phase.slice(1)}</span>
}

// ---------------------------------------------------------------------------
// Session type badge
// ---------------------------------------------------------------------------

const SESSION_STYLES: Record<string, string> = {
  strength:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  power:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  maintenance: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

function SessionBadge({ type }: { type: string | null }) {
  const label = type ?? 'strength'
  const style = SESSION_STYLES[label] ?? SESSION_STYLES.strength
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>{label}</span>
}

// ---------------------------------------------------------------------------
// Log Session Form
// ---------------------------------------------------------------------------

const EMPTY_ROW: ExerciseRow = { name: '', sets: '', reps: '', weight_kg: '', rpe: '' }

interface LogFormProps {
  userId: number
  initialExercises?: ExerciseRow[]
  onSaved: () => void
  onCancel: () => void
}

function LogForm({ userId, initialExercises, onSaved, onCancel }: LogFormProps) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [sessionType, setSessionType] = useState('strength')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<ExerciseRow[]>(
    initialExercises && initialExercises.length > 0 ? initialExercises : [{ ...EMPTY_ROW }]
  )
  const [saving, setSaving] = useState(false)

  function updateRow(i: number, field: keyof ExerciseRow, val: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const exercises = rows
        .filter(r => r.name.trim())
        .map(r => ({
          name: r.name.trim(),
          sets: r.sets ? parseInt(r.sets, 10) : null,
          reps: r.reps || null,
          weight_kg: r.weight_kg ? parseFloat(r.weight_kg) : null,
          rpe: r.rpe ? parseFloat(r.rpe) : null,
        }))

      await apiFetch('/api/weights/sessions', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          date,
          session_type: sessionType,
          duration_min: duration ? parseInt(duration, 10) : null,
          notes: notes || null,
          exercises: JSON.stringify(exercises),
        }),
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs mb-1 block">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Type</Label>
          <Select value={sessionType} onValueChange={setSessionType}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="strength">Strength</SelectItem>
              <SelectItem value="power">Power</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Exercise rows */}
      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-1 text-xs text-slate-400 font-medium px-1">
          <span className="col-span-4">Exercise</span>
          <span className="col-span-2 text-center">Sets</span>
          <span className="col-span-2 text-center">Reps</span>
          <span className="col-span-2 text-center">kg</span>
          <span className="col-span-1 text-center">RPE</span>
          <span className="col-span-1" />
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-1 items-center">
            <Input
              className="col-span-4 h-8 text-sm"
              placeholder="Exercise"
              value={row.name}
              onChange={e => updateRow(i, 'name', e.target.value)}
            />
            <Input className="col-span-2 h-8 text-sm text-center" placeholder="3" type="number" min="1"
              value={row.sets} onChange={e => updateRow(i, 'sets', e.target.value)} />
            <Input className="col-span-2 h-8 text-sm text-center" placeholder="10"
              value={row.reps} onChange={e => updateRow(i, 'reps', e.target.value)} />
            <Input className="col-span-2 h-8 text-sm text-center" placeholder="—" type="number" min="0" step="0.5"
              value={row.weight_kg} onChange={e => updateRow(i, 'weight_kg', e.target.value)} />
            <Input className="col-span-1 h-8 text-sm text-center" placeholder="7" type="number" min="1" max="10"
              value={row.rpe} onChange={e => updateRow(i, 'rpe', e.target.value)} />
            <button type="button" onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))}
              className="col-span-1 flex justify-center text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-full text-xs"
          onClick={() => setRows(prev => [...prev, { ...EMPTY_ROW }])}>
          <Plus className="w-3 h-3 mr-1" /> Add exercise
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs mb-1 block">Duration (min)</Label>
          <Input type="number" min="1" placeholder="50" value={duration} onChange={e => setDuration(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Notes</Label>
          <Input placeholder="Optional" value={notes} onChange={e => setNotes(e.target.value)} className="h-9" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save Session'}</Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Session card (expandable)
// ---------------------------------------------------------------------------

function SessionCard({ session, onDelete }: { session: SessionData; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {new Date(session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
          <SessionBadge type={session.session_type} />
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {session.exercises_list.length} exercise{session.exercises_list.length !== 1 ? 's' : ''}
            {session.duration_min ? ` · ${session.duration_min} min` : ''}
            {session.wtss != null ? ` · ${session.wtss} wTSS` : ''}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-3 pb-3 pt-2 space-y-2">
          {session.exercises_list.length > 0 ? (
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-1 text-xs text-slate-400 font-medium">
                <span className="col-span-4">Exercise</span>
                <span className="col-span-2 text-center">Sets</span>
                <span className="col-span-2 text-center">Reps</span>
                <span className="col-span-2 text-center">kg</span>
                <span className="col-span-2 text-center">RPE</span>
              </div>
              {session.exercises_list.map((ex, i) => (
                <div key={i} className="grid grid-cols-12 gap-1 text-sm">
                  <span className="col-span-4 text-slate-700 dark:text-slate-300 truncate">{ex.name}</span>
                  <span className="col-span-2 text-center text-slate-500">{ex.sets ?? '—'}</span>
                  <span className="col-span-2 text-center text-slate-500">{ex.reps ?? '—'}</span>
                  <span className="col-span-2 text-center text-slate-500">{ex.weight_kg != null ? `${ex.weight_kg}` : '—'}</span>
                  <span className="col-span-2 text-center text-slate-500">{ex.rpe ?? '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No exercises recorded.</p>
          )}
          {session.notes && (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">{session.notes}</p>
          )}
          <button onClick={() => onDelete(session.id)}
            className="text-xs text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-500 flex items-center gap-1 mt-1">
            <Trash2 className="w-3 h-3" /> Delete session
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Progressive overload panel
// ---------------------------------------------------------------------------

function OverloadPanel({ exercises }: { exercises: ExerciseLibraryItem[] }) {
  const [selected, setSelected] = useState<string>('')

  const { data: history, isLoading } = useQuery<ExerciseHistoryEntry[]>({
    queryKey: ['weights', 'history', selected],
    queryFn: () => apiFetch(`/api/weights/history/${encodeURIComponent(selected)}`),
    enabled: !!selected,
  })

  // Compute trend between last two appearances
  function trend(): string | null {
    if (!history || history.length < 2) return null
    const latest = history[0].exercises[0]
    const prev = history[1].exercises[0]
    if (latest?.weight_kg != null && prev?.weight_kg != null) {
      const diff = (latest.weight_kg as number) - (prev.weight_kg as number)
      if (diff === 0) return '= same weight as last time'
      return `${diff > 0 ? '↑' : '↓'} ${Math.abs(diff)} kg vs last session`
    }
    return null
  }

  const trendText = trend()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-500" /> Progressive Overload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger><SelectValue placeholder="Select an exercise…" /></SelectTrigger>
          <SelectContent>
            {exercises.map(ex => (
              <SelectItem key={ex.name} value={ex.name}>
                {ex.name.charAt(0).toUpperCase() + ex.name.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected && (
          <>
            {isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-6 w-full" />)}</div>
            ) : history && history.length > 0 ? (
              <>
                {trendText && (
                  <p className={`text-sm font-medium ${trendText.startsWith('↑') ? 'text-green-600 dark:text-green-400' : trendText.startsWith('↓') ? 'text-red-500' : 'text-slate-500'}`}>
                    {trendText}
                  </p>
                )}
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-1 text-xs text-slate-400 font-medium">
                    <span className="col-span-3">Date</span>
                    <span className="col-span-2 text-center">Sets</span>
                    <span className="col-span-2 text-center">Reps</span>
                    <span className="col-span-3 text-center">Weight (kg)</span>
                    <span className="col-span-2 text-center">RPE</span>
                  </div>
                  {history.map((entry) =>
                    entry.exercises.map((ex, i) => (
                      <div key={`${entry.session_id}-${i}`} className="grid grid-cols-12 gap-1 text-sm">
                        <span className="col-span-3 text-slate-600 dark:text-slate-400">
                          {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="col-span-2 text-center text-slate-500">{ex.sets ?? '—'}</span>
                        <span className="col-span-2 text-center text-slate-500">{ex.reps ?? '—'}</span>
                        <span className="col-span-3 text-center text-slate-500">{ex.weight_kg != null ? `${ex.weight_kg}` : '—'}</span>
                        <span className="col-span-2 text-center text-slate-500">{ex.rpe ?? '—'}</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
                No history for {selected} yet.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function WeightsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [prefillExercises, setPrefillExercises] = useState<ExerciseRow[] | undefined>()

  const { data: userProfile } = useQuery<{ id: number }>({
    queryKey: ['profile'],
    queryFn: () => apiFetch('/api/profile'),
    retry: false,
  })

  const { data: plan, isLoading: planLoading } = useQuery<PlanResponse>({
    queryKey: ['weights', 'plan'],
    queryFn: () => apiFetch('/api/weights/plan'),
  })

  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery<SessionData[]>({
    queryKey: ['weights', 'sessions'],
    queryFn: () => apiFetch('/api/weights/sessions?days=90'),
  })

  const { data: exercises } = useQuery<ExerciseLibraryItem[]>({
    queryKey: ['weights', 'exercises'],
    queryFn: () => apiFetch('/api/weights/exercises'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/weights/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => refetchSessions(),
  })

  function usePlan() {
    if (!plan) return
    const prefill: ExerciseRow[] = plan.prescriptions.map(p => ({
      name: p.exercise_name,
      sets: String(p.sets),
      reps: p.reps,
      weight_kg: '',
      rpe: '',
    }))
    setPrefillExercises(prefill)
    setShowForm(true)
  }

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Weight Training</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Strength &amp; conditioning sessions</p>
        </div>
        <Button className="gap-2 flex-shrink-0" onClick={() => { setPrefillExercises(undefined); setShowForm(true) }}>
          <Plus className="w-4 h-4" /> Log Session
        </Button>
      </div>

      {/* Log form */}
      {showForm && (
        <LogForm
          userId={userProfile?.id ?? 1}
          initialExercises={prefillExercises}
          onSaved={() => { setShowForm(false); refetchSessions() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Today's Plan */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Today&apos;s Plan</CardTitle>
            {plan && <PhaseBadge phase={plan.phase} />}
          </div>
        </CardHeader>
        <CardContent>
          {planLoading ? (
            <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : plan && plan.prescriptions.length > 0 ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                {plan.prescriptions.map((p, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">{p.exercise_name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{p.sets}×{p.reps} · rest {p.rest_s}s</p>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-right max-w-[55%] hidden sm:block">{p.guidance}</p>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={usePlan}>
                <Sparkles className="w-4 h-4 mr-1" /> Use this plan
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-3">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No plan available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progressive overload */}
      {exercises && exercises.length > 0 && <OverloadPanel exercises={exercises} />}

      {/* Recent sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessionsLoading ? (
            <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : sessions && sessions.length > 0 ? (
            sessions.slice(0, 10).map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onDelete={id => deleteMutation.mutate(id)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center gap-3 py-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800">
                <Dumbbell className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">No sessions logged yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-xs">
                Tap &ldquo;Log Session&rdquo; to record your first strength workout
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="h-2" />
    </div>
  )
}
