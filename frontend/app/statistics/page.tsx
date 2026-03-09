import { Calendar, CalendarDays, Infinity as InfinityIcon } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

const statSections = [
  {
    href: '/statistics/weekly',
    icon: Calendar,
    title: 'Weekly Statistics',
    description: 'Distance, elevation, TSS, HRV trends — week by week',
    iconBg: 'bg-teal-100 dark:bg-teal-900/40',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    href: '/statistics/monthly',
    icon: CalendarDays,
    title: 'Monthly Statistics',
    description: 'Month-over-month training volume and fitness progression',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    href: '/statistics/alltime',
    icon: InfinityIcon,
    title: 'All-Time Statistics',
    description: 'Activity heatmap, cumulative distance, PRs, and VO2max',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
]

export default function StatisticsPage() {
  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Statistics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Analyse your training data
        </p>
      </div>

      <div className="space-y-3">
        {statSections.map(({ href, icon: Icon, title, description, iconBg, iconColor }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99] transition-transform">
              <CardContent className="flex items-center gap-4 py-4">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 ${iconBg}`}
                >
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {description}
                  </p>
                </div>
                <div className="text-slate-300 dark:text-slate-600 flex-shrink-0">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="h-2" />
    </div>
  )
}
