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

/**
 * Parse an ISO date or datetime string into a local Date.
 * Date-only strings (YYYY-MM-DD) are spec'd to parse as UTC midnight, which
 * shifts the displayed date by one day in timezones behind UTC. Appending a
 * local noon time anchor avoids this in all UTC-12…UTC+14 zones.
 */
function parseIso(iso: string): Date {
  return iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso)
}

/** Format a date/datetime string into a short local date, e.g. "9 Mar" */
export function formatShortDate(iso: string): string {
  return parseIso(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Format a date/datetime string into "9 Mar 2026" */
export function formatLongDate(iso: string): string {
  return parseIso(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
