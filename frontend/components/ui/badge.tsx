import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
        secondary:
          'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
        outline:
          'border border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-300',
        destructive:
          'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        success:
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
        warning:
          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
