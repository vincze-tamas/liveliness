/** Format seconds into "1h 23m" or "45m" */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/** Format metres into "12.3 km" or "850 m" */
export function formatDistance(metres: number): string {
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`
  return `${Math.round(metres)} m`
}

/** Format s/km pace into "4:32" */
export function formatPace(sPerKm: number): string {
  const m = Math.floor(sPerKm / 60)
  const s = Math.round(sPerKm % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Format a datetime string into a short local date, e.g. "9 Mar" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Format a datetime string into "9 Mar 2026" */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
