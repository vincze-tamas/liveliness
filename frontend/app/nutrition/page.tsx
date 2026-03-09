'use client'

import { useState } from 'react'
import { Beef, Wheat, Droplets, Flame, UserCircle, Plus, Trash2, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NutritionProfile {
  id: number
  training_type: string | null
  target_kcal: number | null
  target_protein_g: number | null
  target_carbs_g: number | null
  target_fat_g: number | null
  target_fluid_ml: number | null
}

interface FoodLogEntry {
  id: number
  meal_type: string
  food_description: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  source: string
  created_at: string
}

interface FoodLogResponse {
  date: string
  entries: FoodLogEntry[]
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number }
}

// ---------------------------------------------------------------------------
// Macro progress bar
// ---------------------------------------------------------------------------

interface MacroBarProps {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  barColor: string
  consumed: number
  target: number | null
  unit: string
}

function MacroBar({ label, icon, color, bgColor, barColor, consumed, target, unit }: MacroBarProps) {
  const pct = target ? Math.min(100, Math.round((consumed / target) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`${color} w-4 h-4`}>{icon}</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {Math.round(consumed)}{unit}
          {target ? <> / {Math.round(target)}{unit}</> : null}
        </span>
      </div>
      <div className={`h-2 rounded-full ${bgColor}`}>
        <div
          className={`h-2 rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Training type badge
// ---------------------------------------------------------------------------

const TRAINING_TYPE_STYLES: Record<string, string> = {
  rest:     'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  easy:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  moderate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  hard:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  long:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

function TrainingBadge({ type }: { type: string | null }) {
  const label = type ?? 'moderate'
  const style = TRAINING_TYPE_STYLES[label] ?? TRAINING_TYPE_STYLES.moderate
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style}`}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Add food form
// ---------------------------------------------------------------------------

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

interface AddFoodFormProps {
  userId: number
  onAdded: () => void
}

function AddFoodForm({ userId, onAdded }: AddFoodFormProps) {
  const [open, setOpen] = useState(false)
  const [mealType, setMealType] = useState('snack')
  const [description, setDescription] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    setSaving(true)
    try {
      await apiFetch('/api/nutrition/log', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          date: today,
          meal_type: mealType,
          food_description: description.trim(),
          calories: calories ? parseFloat(calories) : null,
          protein_g: protein ? parseFloat(protein) : null,
          carbs_g: carbs ? parseFloat(carbs) : null,
          fat_g: fat ? parseFloat(fat) : null,
          source: 'manual',
        }),
      })
      setDescription(''); setCalories(''); setProtein(''); setCarbs(''); setFat('')
      setOpen(false)
      onAdded()
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full">
        <Plus className="w-4 h-4 mr-1" /> Add food
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs mb-1 block">Meal</Label>
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEAL_TYPES.map(m => (
                <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label className="text-xs mb-1 block">Food / description</Label>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Oat porridge with berries"
            className="h-9"
            required
          />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Calories (kcal)</Label>
          <Input type="number" min="0" value={calories} onChange={e => setCalories(e.target.value)} className="h-9" placeholder="350" />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Protein (g)</Label>
          <Input type="number" min="0" value={protein} onChange={e => setProtein(e.target.value)} className="h-9" placeholder="12" />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Carbs (g)</Label>
          <Input type="number" min="0" value={carbs} onChange={e => setCarbs(e.target.value)} className="h-9" placeholder="60" />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Fat (g)</Label>
          <Input type="number" min="0" value={fat} onChange={e => setFat(e.target.value)} className="h-9" placeholder="8" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving} className="flex-1">
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function NutritionPage() {
  const queryClient = useQueryClient()

  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useQuery<NutritionProfile>({
    queryKey: ['nutrition', 'today'],
    queryFn: () => apiFetch('/api/nutrition/today'),
    retry: false,
  })

  const { data: logData, isLoading: logLoading, refetch: refetchLog } = useQuery<FoodLogResponse>({
    queryKey: ['nutrition', 'log'],
    queryFn: () => apiFetch('/api/nutrition/log'),
  })

  const generateMutation = useMutation({
    mutationFn: () => apiFetch<NutritionProfile>('/api/nutrition/generate', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'today'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/nutrition/log/${id}`, { method: 'DELETE' }),
    onSuccess: () => refetchLog(),
  })

  const profileMissing = profileError && (profileError as Error).message.includes('404')
  const profileSetupNeeded = generateMutation.error &&
    (generateMutation.error as Error).message.includes('422')

  // Group entries by meal type
  const grouped = MEAL_TYPES.reduce<Record<string, FoodLogEntry[]>>((acc, m) => {
    acc[m] = logData?.entries.filter(e => e.meal_type === m) ?? []
    return acc
  }, {})

  const totals = logData?.totals ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nutrition</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Daily macro targets &amp; food log
        </p>
      </div>

      {/* Profile incomplete warning */}
      {profileSetupNeeded && (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
          <UserCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Profile incomplete</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Add your weight, height, date of birth and sex to generate nutrition targets.
            </p>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="mt-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-700">
                Go to Profile
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Macro targets card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Today&apos;s Targets</CardTitle>
            {profile && (
              <div className="mt-1">
                <TrainingBadge type={profile.training_type} />
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
            {profileMissing ? 'Generate' : 'Recalculate'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {profileLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : profile ? (
            <>
              <MacroBar label="Calories" icon={<Flame className="w-4 h-4" />} color="text-orange-500"
                bgColor="bg-orange-100 dark:bg-orange-900/20" barColor="bg-orange-500"
                consumed={totals.calories} target={profile.target_kcal} unit=" kcal" />
              <MacroBar label="Protein" icon={<Beef className="w-4 h-4" />} color="text-red-500"
                bgColor="bg-red-100 dark:bg-red-900/20" barColor="bg-red-500"
                consumed={totals.protein_g} target={profile.target_protein_g} unit="g" />
              <MacroBar label="Carbs" icon={<Wheat className="w-4 h-4" />} color="text-amber-500"
                bgColor="bg-amber-100 dark:bg-amber-900/20" barColor="bg-amber-500"
                consumed={totals.carbs_g} target={profile.target_carbs_g} unit="g" />
              <MacroBar label="Fat" icon={<Droplets className="w-4 h-4" />} color="text-blue-500"
                bgColor="bg-blue-100 dark:bg-blue-900/20" barColor="bg-blue-500"
                consumed={totals.fat_g} target={profile.target_fat_g} unit="g" />
              {profile.target_fluid_ml && (
                <p className="text-xs text-slate-400 dark:text-slate-500 pt-1">
                  Fluid target: {(profile.target_fluid_ml / 1000).toFixed(1)} L
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
              No targets for today — press &quot;Generate&quot; to calculate based on your profile.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Food log */}
      <Card>
        <CardHeader>
          <CardTitle>Food Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {logLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            MEAL_TYPES.map(meal => {
              const entries = grouped[meal]
              if (entries.length === 0) return null
              return (
                <div key={meal}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                    {meal}
                  </p>
                  <div className="space-y-1">
                    {entries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {entry.food_description}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {entry.calories != null ? `${Math.round(entry.calories)} kcal` : '—'}
                            {entry.protein_g != null ? ` · P ${Math.round(entry.protein_g)}g` : ''}
                            {entry.carbs_g != null ? ` · C ${Math.round(entry.carbs_g)}g` : ''}
                            {entry.fat_g != null ? ` · F ${Math.round(entry.fat_g)}g` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(entry.id)}
                          className="text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-500 flex-shrink-0"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}

          {logData && logData.entries.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-2">
              No food logged today yet.
            </p>
          )}

          {/* Add food form — needs user_id; fall back to 1 for single-user app */}
          <AddFoodForm userId={1} onAdded={() => refetchLog()} />
        </CardContent>
      </Card>

      <div className="h-2" />
    </div>
  )
}
