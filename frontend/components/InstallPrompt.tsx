'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Only shown if the app is not already installed and the browser supports the event.
    // Safari (iOS) doesn't fire this event — the setup page guides iOS users manually.
    if (localStorage.getItem('pwa-install-dismissed') === '1') {
      setDismissed(true)
      return
    }
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
    setPrompt(null)
  }

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') dismiss()
    else setPrompt(null)
  }

  if (!prompt || dismissed) return null

  return (
    <div className="fixed bottom-20 inset-x-3 z-40 flex items-center gap-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-2xl px-4 py-3 border border-slate-700">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-600 flex-shrink-0">
        <Download className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Install Liveliness</p>
        <p className="text-xs text-slate-400 truncate">Add to home screen for the best experience</p>
      </div>
      <Button size="sm" onClick={install} className="bg-teal-600 hover:bg-teal-700 text-white flex-shrink-0 h-8 px-3 text-xs">
        Install
      </Button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-slate-400 hover:text-white flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
