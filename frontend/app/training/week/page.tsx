'use client'

import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Mountain,
  Bike,
  Snowflake,
  Zap,
  Dumbbell,
  Footprints,
  Clock,
  Flame,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types (matches planner.py output)
// ---------------------------------------------------------------------------

interface Session {
  day: string
  sport: string
  session_type: string
  target_duration_min: number
  target_tss: number
  description: string
  is_rest: boolean
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SPORT_LABEL: Record<string, string> = {
  trail_run:    'Trail Run',
  road_bike:    'Road Bike',
  mtb:          'MTB',
  ski_alpine:   'Alpine Ski',
  inline_skate: 'Inline Skate',
  gym:          'Weight Training',
  rest:         'Rest',
}

const SPORT_ICON: Record<string, React.ReactNode> = {
  trail_run:    <Mountain className="w-5 h-5" />,
  road_bike:    <Bike className="w-5 h-5" />,
  mtb:          <Bike className="w-5 h-5" />,
  ski_alpine:   <Snowflake className="w-5 h-5" />,
  inline_skate: <Zap className="w-5 h-5" />,
  gym:          <Dumbbell className="w-5 h-5" />,
  rest:         <Footprints className="w-5 h-5" />,
}

const SPORT_BADGE: Record<string, string> = {
  trail_run:    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  road_bike:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  mtb:          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ski_alpine:   'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  inline_skate: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  gym:          'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  rest:         'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
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

const PHASE_STYLES: Record<string, string> = {
  base:     'text-teal-600 dark:text-teal-400',
  build:    'text-amber-600 dark:text-amber-400',
  peak:     'text-red-600 dark:text-red-400',
  taper:    'text-purple-600 dark:text-purple-400',
  race:     'text-indigo-600 dark:text-indigo-400',
  recovery: 'text-emerald-600 dark:text-emerald-400',
  off:      'text-slate-500',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSessions(json: string | null): Session[] {
  if (!json) return []
  try { return JSON.parse(json) as Session[] } catch { return [] }
}

function weekRangeLabel(weekStart: string): string {
  const mon = new Date(weekStart)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fmt(mon)} – ${fmt(sun)}`
}

function todayDayLabel(): string {
  const dow = new Date().getDay()  // 0=Sun
  return WEEK_DAYS[(dow + 6) % 7]  // Mon=0
}

// ---------------------------------------------------------------------------
// Session Card
// ---------------------------------------------------------------------------

interface SessionCardProps {
  session: Session
  isToday: boolean
}

function SessionCard({ session, isToday }: SessionCardProps) {
  const badge = SPORT_BADGE[session.sport] ?? SPORT_BADGE.rest
  const icon = SPORT_ICON[session.sport] ?? <Footprints className="w-5 h-5" />
  const sportLabel = SPORT_LABEL[session.sport] ?? session.sport
  const typeLabel = SESSION_TYPE_LABEL[session.session_type] ?? session.session_type

  return (
    <Card
      className={cn(
        'transition-all',
        isToday && 'ring-1 ring-teal-400 dark:ring-teal-600',
        session.is_rest && 'opacity-60'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Day badge */}
          <div
            className={cn(
              'flex-shrink-0 w-12 text-center pt-0.5',
              isToday ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'
            )}
          >
            <p className={cn('text-sm font-bold', isToday && 'text-teal-600 dark:text-teal-400')}>
              {session.day}
            </p>
            {isToday && (
              <p className="text-[10px] text-teal-500 dark:text-teal-400">today</p>
            )}
          </div>

          {/* Icon */}
          <div className={cn('flex-shrink-0 mt-0.5', badge, 'p-2 rounded-xl')}>
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {sportLabel}
              </span>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  badge
                )}
              >
                {typeLabel}
              </span>
            </div>

            {!session.is_rest && (
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {session.target_duration_min} min
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Flame className="w-3.5 h-3.5" />
                  {session.target_tss} TSS
                </span>
              </div>
            )}

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {session.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TrainingWeekPage() {
  const today = todayDayLabel()

  const { data: plan, isLoading, isError } = useQuery<TrainingPlan>({
    queryKey: ['training-plan-current'],
    queryFn: () => apiFetch<TrainingPlan>('/api/training/plans/current'),
    retry: false,
  })

  const sessions = parseSessions(plan?.sessions ?? null)

  // Sort sessions in WEEK_DAYS order
  const sortedSessions = WEEK_DAYS.map(
    (day) => sessions.find((s) => s.day === day)
  ).filter(Boolean) as Session[]

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/training"
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">This Week</h1>
          {plan?.week_start && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {weekRangeLabel(plan.week_start)}
            </p>
          )}
        </div>
      </div>

      {/* Phase + goal summary */}
      {plan && (plan.phase || plan.goal_description) && (
        <div className="flex items-center gap-3 py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          {plan.phase && (
            <span
              className={cn(
                'text-sm font-semibold capitalize',
                PHASE_STYLES[plan.phase] ?? 'text-slate-600'
              )}
            >
              {plan.phase}
            </span>
          )}
          {plan.phase && plan.goal_description && (
            <span className="text-slate-300 dark:text-slate-600">·</span>
          )}
          {plan.goal_description && (
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {plan.goal_description}
            </span>
          )}
          {plan.planned_tss && (
            <span className="ml-auto text-xs text-slate-400">
              {plan.planned_tss} TSS · {plan.planned_hours} h
            </span>
          )}
        </div>
      )}

      {/* Session list */}
      {isLoading ? (
        <div className="space-y-3">
          {WEEK_DAYS.map((d) => (
            <Skeleton key={d} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : isError || sessions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No plan for this week yet.
            </p>
            <Link
              href="/training"
              className="mt-3 inline-block text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              Generate a plan →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedSessions.map((s) => (
            <SessionCard
              key={s.day}
              session={s}
              isToday={s.day === today}
            />
          ))}
        </div>
      )}

      <div className="h-2" />
    </div>
  )
}
