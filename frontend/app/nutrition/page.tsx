import { Beef, Wheat, Droplets, Flame, UserCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface MacroRingProps {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

function MacroRing({ label, icon, color, bgColor }: MacroRingProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex items-center justify-center w-16 h-16 rounded-full ${bgColor} border-4 border-slate-100 dark:border-slate-700`}
      >
        <span className={color}>{icon}</span>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-slate-900 dark:text-white">—</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}

export default function NutritionPage() {
  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Nutrition
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Daily macro targets &amp; recommendations
        </p>
      </div>

      {/* Empty State Banner */}
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
        <UserCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Profile not set up
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
            Set up your profile to get personalised nutrition recommendations
          </p>
          <Link href="/profile">
            <Button variant="outline" size="sm" className="mt-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-700">
              Go to Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Today's Training Type */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Training Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
              No session planned
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            Nutrition targets adapt to your planned training intensity
          </p>
        </CardContent>
      </Card>

      {/* Macro Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Macro Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 py-2">
            <MacroRing
              label="Protein"
              icon={<Beef className="w-6 h-6" />}
              color="text-red-500"
              bgColor="bg-red-100 dark:bg-red-900/30"
            />
            <MacroRing
              label="Carbs"
              icon={<Wheat className="w-6 h-6" />}
              color="text-amber-500"
              bgColor="bg-amber-100 dark:bg-amber-900/30"
            />
            <MacroRing
              label="Fat"
              icon={<Droplets className="w-6 h-6" />}
              color="text-blue-500"
              bgColor="bg-blue-100 dark:bg-blue-900/30"
            />
            <MacroRing
              label="Calories"
              icon={<Flame className="w-6 h-6" />}
              color="text-orange-500"
              bgColor="bg-orange-100 dark:bg-orange-900/30"
            />
          </div>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center">
            Complete your profile to unlock personalised targets
          </p>
        </CardContent>
      </Card>

      <div className="h-2" />
    </div>
  )
}
