import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800">
        <WifiOff className="w-8 h-8 text-slate-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          You&apos;re offline
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          Connect to your network to sync new data. Previously loaded pages are still available.
        </p>
      </div>
    </div>
  )
}
