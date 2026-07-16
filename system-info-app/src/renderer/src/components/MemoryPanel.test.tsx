import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryPanel } from './MemoryPanel'
import { systemInfoClient } from '../api/systemInfoClient'

vi.mock('../api/systemInfoClient', () => ({
  systemInfoClient: { getMemoryInfo: vi.fn() }
}))

describe('MemoryPanel', () => {
  beforeEach(() => {
    vi.mocked(systemInfoClient.getMemoryInfo).mockReset()
  })

  it('renders used, total, percentage and free memory', async () => {
    vi.mocked(systemInfoClient.getMemoryInfo).mockResolvedValue({
      totalBytes: 16 * 1024 ** 3,
      freeBytes: 4 * 1024 ** 3,
      usedBytes: 12 * 1024 ** 3,
      usedPercentage: 75
    })
    render(<MemoryPanel intervalMs={null} />)
    // the brief requires all four figures, including free memory
    expect(await screen.findByText(/12\.0 GB used of 16\.0 GB \(75%\), 4\.0 GB free/)).toBeTruthy()
  })

  it('shows the error state when the fetch fails', async () => {
    vi.mocked(systemInfoClient.getMemoryInfo).mockRejectedValue(new Error('no data'))
    render(<MemoryPanel intervalMs={null} />)
    expect(await screen.findByText('Memory unavailable: no data')).toBeTruthy()
  })
})
