import withPWA from '@next/pwa'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default withPWA({
  dest: 'public',
  // Disable SW in dev so hot-reload isn't intercepted
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Cache the offline page so it's available when network drops
  fallbacks: {
    document: '/offline',
  },
})(nextConfig)
