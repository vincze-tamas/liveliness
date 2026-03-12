export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

/** Returns true when the error is a 503 from an AI endpoint (e.g. missing API key). */
export function isAiUnavailable(err: unknown): boolean {
  return err instanceof Error && err.message.includes('503')
}
