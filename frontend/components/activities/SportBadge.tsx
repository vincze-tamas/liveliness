import * as React from 'react'
import { Bike, Mountain, MountainSnow, Wind, Dumbbell, Footprints } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SportType =
  | 'trail_run'
  | 'mtb'
  | 'road_bike'
  | 'ski_alpine'
  | 'inline_skate'
  | 'gym'

interface SportConfig {
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  bgColor: string
  textColor: string
}

const sportConfig: Record<SportType, SportConfig> = {
  trail_run: {
    label: 'Trail Run',
    icon: Mountain,
    bgColor: 'bg-teal-100 dark:bg-teal-900/40',
    textColor: 'text-teal-700 dark:text-teal-300',
  },
  mtb: {
    label: 'MTB',
    icon: Bike,
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  road_bike: {
    label: 'Road Bike',
    icon: Bike,
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/40',
    textColor: 'text-indigo-700 dark:text-indigo-300',
  },
  ski_alpine: {
    label: 'Alpine Ski',
    icon: MountainSnow,
    bgColor: 'bg-sky-100 dark:bg-sky-900/40',
    textColor: 'text-sky-600 dark:text-sky-300',
  },
  inline_skate: {
    label: 'Inline Skate',
    icon: Wind,
    bgColor: 'bg-pink-100 dark:bg-pink-900/40',
    textColor: 'text-pink-600 dark:text-pink-300',
  },
  gym: {
    label: 'Gym',
    icon: Dumbbell,
    bgColor: 'bg-purple-100 dark:bg-purple-900/40',
    textColor: 'text-purple-700 dark:text-purple-300',
  },
}

interface SportBadgeProps {
  sport: SportType
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function SportBadge({
  sport,
  className,
  showLabel = true,
  size = 'md',
}: SportBadgeProps) {
  const config = sportConfig[sport]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.textColor,
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <Icon
        className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')}
        strokeWidth={2}
      />
      {showLabel && config.label}
    </span>
  )
}

export { sportConfig }
