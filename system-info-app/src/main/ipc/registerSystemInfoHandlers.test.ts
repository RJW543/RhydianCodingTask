import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock electron: these tests only need to capture what gets registered on ipcMain.
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }))

import { ipcMain } from 'electron'
import { registerSystemInfoHandlers } from './registerSystemInfoHandlers'
import { IpcChannels } from '../../shared/ipcChannels'
import type { SystemInfoService } from '../services/SystemInfoService'
import type { OsInfo } from '../../shared/types'

const osInfo: OsInfo = {
  osName: 'TestOS',
  osVersion: '1.0',
  platform: 'win32',
  arch: 'x64',
  hostname: 'TEST',
  currentUser: 'tester'
}

// A fake service satisfying the contract - exactly what dependency injection buys us.
function makeService(overrides: Partial<SystemInfoService> = {}): SystemInfoService {
  return {
    getOsInfo: vi.fn().mockResolvedValue(osInfo),
    getProcesses: vi.fn().mockResolvedValue([]),
    getMemoryInfo: vi
      .fn()
      .mockResolvedValue({ totalBytes: 100, freeBytes: 25, usedBytes: 75, usedPercentage: 75 }),
    getDiskInfo: vi.fn().mockResolvedValue([]),
    ...overrides
  }
}

// Digs the registered handler for a channel back out of the ipcMain mock.
function handlerFor(channel: string): (event: unknown) => Promise<unknown> {
  const call = vi.mocked(ipcMain.handle).mock.calls.find(([ch]) => ch === channel)
  if (!call) throw new Error(`no handler registered for ${channel}`)
  return call[1] as (event: unknown) => Promise<unknown>
}

describe('registerSystemInfoHandlers', () => {
  beforeEach(() => {
    vi.mocked(ipcMain.handle).mockClear()
  })

  it('registers one handler per channel', () => {
    registerSystemInfoHandlers(makeService())
    const channels = vi.mocked(ipcMain.handle).mock.calls.map(([ch]) => ch)
    expect(channels.sort()).toEqual(Object.values(IpcChannels).sort())
  })

  it('wraps successful service calls in an ok envelope', async () => {
    registerSystemInfoHandlers(makeService())
    const result = await handlerFor(IpcChannels.getOsInfo)({})
    expect(result).toEqual({ ok: true, data: osInfo })
  })

  it('wraps service failures in an error envelope instead of throwing', async () => {
    // this is the error-handling contract: the renderer must always receive
    // something typed and displayable, never a mangled IPC exception
    registerSystemInfoHandlers(
      makeService({ getProcesses: vi.fn().mockRejectedValue(new Error('PowerShell died')) })
    )
    const result = await handlerFor(IpcChannels.getProcesses)({})
    expect(result).toEqual({ ok: false, error: 'PowerShell died' })
  })

  it('stringifies non-Error failures', async () => {
    registerSystemInfoHandlers(makeService({ getDiskInfo: vi.fn().mockRejectedValue('bad') }))
    const result = await handlerFor(IpcChannels.getDiskInfo)({})
    expect(result).toEqual({ ok: false, error: 'bad' })
  })
})
