//reusable function bundling state and effects 

import { useCallback, useEffect, useRef, useState } from 'react'

//this hook is used to poll a query at a given interval, or manually refresh it if the interval is null. It returns the data, error, loading state, and a refresh function.
export function usePolledQuery<T>(
  fetcher: () => Promise<T>,
  intervalMs: number | null // null = manual refresh only
): { data: T | null; error: string | null; loading: boolean; refresh: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const busy = useRef(false) // a ref survives re-renders without causing them; used as a "fetch in progress" flag

  // the refresh function is wrapped in useCallback to prevent it from being recreated on every render, which would cause the useEffect to run more often than intended
  const refresh = useCallback(async () => {
    if (busy.current) return // prevents overlapping requests if a fetch is slower than the interval
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

  // useEffect is used to run the refresh function on mount and set up the polling interval. It cleans up the interval when the component unmounts or when the interval changes.
  useEffect(() => {
    void refresh() // fetch immediately on mount (when the component first appears)
    if (intervalMs === null) return
    const id = setInterval(() => void refresh(), intervalMs)
    return () => clearInterval(id) // cleanup: React runs this when the interval changes or the component disappears
  }, [refresh, intervalMs])

  return { data, error, loading, refresh }
}