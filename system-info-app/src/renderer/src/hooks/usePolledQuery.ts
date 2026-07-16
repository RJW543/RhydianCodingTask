import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Fetches data on mount and then on a fixed interval (null = manual refresh
 * only). Shared by every panel. Returns the latest data plus loading/error
 * state and a manual refresh function.
 */
export function usePolledQuery<T>(
  fetcher: () => Promise<T>,
  intervalMs: number | null
): { data: T | null; error: string | null; loading: boolean; refresh: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const busy = useRef(false) // guards against overlapping requests when a fetch is slower than the interval

  // useCallback keeps refresh's identity stable so the effect below does not
  // restart its timer on every render
  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      setData(await fetcher())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    void refresh()
    if (intervalMs === null) return
    const id = setInterval(() => void refresh(), intervalMs)
    return () => clearInterval(id) // cleanup on unmount or when the interval changes
  }, [refresh, intervalMs])

  return { data, error, loading, refresh }
}
