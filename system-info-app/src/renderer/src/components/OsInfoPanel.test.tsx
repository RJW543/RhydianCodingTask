import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OsInfoPanel } from './OsInfoPanel'
import { systemInfoClient } from '../api/systemInfoClient'
import type { OsInfo } from '../../../shared/types'

// The api client is the single seam between the UI and the preload bridge,
// so mocking it here tests the component without any Electron involved.
vi.mock('../api/systemInfoClient', () => ({
  systemInfoClient: { getOsInfo: vi.fn() }
}))

const osInfo: OsInfo = {
  osName: 'Windows 11 Home',
  osVersion: '10.0.26200',
  platform: 'win32',
  arch: 'x64',
  hostname: 'DESKTOP-TEST',
  currentUser: 'rhydian'
}

describe('OsInfoPanel', () => {
  beforeEach(() => {
    vi.mocked(systemInfoClient.getOsInfo).mockReset()
  })

  it('shows a loading state first', () => {
    vi.mocked(systemInfoClient.getOsInfo).mockReturnValue(new Promise(() => {})) // never resolves
    render(<OsInfoPanel />)
    expect(screen.getByText('Loading OS information…')).toBeTruthy()
  })

  it('renders every OS field once loaded', async () => {
    vi.mocked(systemInfoClient.getOsInfo).mockResolvedValue(osInfo)
    render(<OsInfoPanel />)
    expect(await screen.findByText('Windows 11 Home')).toBeTruthy()
    expect(screen.getByText('10.0.26200')).toBeTruthy()
    expect(screen.getByText('win32 / x64')).toBeTruthy()
    expect(screen.getByText('DESKTOP-TEST')).toBeTruthy()
    expect(screen.getByText('rhydian')).toBeTruthy()
  })

  it('shows "Not available" when there is no current user', async () => {
    vi.mocked(systemInfoClient.getOsInfo).mockResolvedValue({ ...osInfo, currentUser: null })
    render(<OsInfoPanel />)
    expect(await screen.findByText('Not available')).toBeTruthy()
  })

  it('shows the error state when the fetch fails', async () => {
    vi.mocked(systemInfoClient.getOsInfo).mockRejectedValue(new Error('bridge unavailable'))
    render(<OsInfoPanel />)
    expect(await screen.findByText('OS information unavailable: bridge unavailable')).toBeTruthy()
  })
})
