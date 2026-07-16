import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePolledQuery } from './usePolledQuery'

// Fake timers let the tests fast-forward the polling interval instead of waiting.
describe('usePolledQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches once on mount and stores the data', async () => {
    const fetcher = vi.fn().mockResolvedValue('first')
    const { result } = renderHook(() => usePolledQuery(fetcher, null))

    expect(result.current.loading).toBe(true)
    await act(async () => {}) // flush the mount fetch
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.current.data).toBe('first')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('re-fetches on the interval', async () => {
    const fetcher = vi.fn().mockResolvedValue('data')
    renderHook(() => usePolledQuery(fetcher, 1000))

    await act(async () => {}) // mount fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000) // three ticks
    })
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it('does not poll when the interval is null (manual only)', async () => {
    const fetcher = vi.fn().mockResolvedValue('data')
    renderHook(() => usePolledQuery(fetcher, null))

    await act(async () => {})
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000)
    })
    expect(fetcher).toHaveBeenCalledTimes(1) // still only the mount fetch
  })

  it('supports manual refresh', async () => {
    const fetcher = vi.fn().mockResolvedValue('data')
    const { result } = renderHook(() => usePolledQuery(fetcher, null))

    await act(async () => {})
    await act(async () => {
      await result.current.refresh()
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('stores the error message when the fetch fails, then clears it on success', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('bridge down'))
      .mockResolvedValueOnce('recovered')
    const { result } = renderHook(() => usePolledQuery(fetcher, null))

    await act(async () => {})
    expect(result.current.error).toBe('bridge down')
    expect(result.current.loading).toBe(false)

    await act(async () => {
      await result.current.refresh()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBe('recovered')
  })

  it('stops polling after unmount', async () => {
    const fetcher = vi.fn().mockResolvedValue('data')
    const { unmount } = renderHook(() => usePolledQuery(fetcher, 1000))

    await act(async () => {})
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fetcher).toHaveBeenCalledTimes(1) // no ticks after cleanup
  })
})
