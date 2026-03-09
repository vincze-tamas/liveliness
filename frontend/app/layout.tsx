import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { BottomNav } from '@/components/nav/BottomNav'
import { TopHeader } from '@/components/nav/TopHeader'
import { InstallPrompt } from '@/components/InstallPrompt'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Liveliness',
  description: 'Personal endurance sports coaching',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Liveliness',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    shortcut: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
        <Providers>
          <TopHeader />
          <main className="flex-1 pb-20 pt-16 overflow-y-auto">
            {children}
          </main>
          <BottomNav />
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  )
}
