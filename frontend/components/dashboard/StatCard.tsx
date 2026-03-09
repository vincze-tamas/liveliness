import * as React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
  valueClassName?: string
}

export function StatCard({
  icon,
  label,
  value,
  unit,
  trend,
  trendValue,
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        {trend && (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend === 'up' && 'text-emerald-500',
              trend === 'down' && 'text-red-500',
              trend === 'neutral' && 'text-slate-400'
            )}
          >
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend === 'neutral' && <Minus className="w-3 h-3" />}
            {trendValue}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'text-xl font-bold text-slate-900 dark:text-white',
            valueClassName
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {unit}
          </span>
        )}
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
        {label}
      </span>
    </div>
  )
}
