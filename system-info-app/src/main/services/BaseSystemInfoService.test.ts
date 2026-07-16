import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Node's os module so the assertions are machine-independent.
vi.mock('node:os', () => ({
  default: {
    version: vi.fn(() => 'Windows 11 Home'),
    release: vi.fn(() => '10.0.26200'),
    platform: vi.fn(() => 'win32'),
    arch: vi.fn(() => 'x64'),
    hostname: vi.fn(() => 'TEST-HOST'),
    userInfo: vi.fn(() => ({ username: 'testuser' })),
    totalmem: vi.fn(() => 16 * 1024 ** 3), // 16 GiB
    freemem: vi.fn(() => 4 * 1024 ** 3) // 4 GiB
  }
}))

import os from 'node:os'
import { BaseSystemInfoService } from './BaseSystemInfoService'
import type { ProcessInfo, DiskInfo } from '../../shared/types'

// The base class is abstract, so the tests need a minimal concrete subclass.
class TestService extends BaseSystemInfoService {
  async getProcesses(): Promise<ProcessInfo[]> {
    return []
  }
  async getDiskInfo(): Promise<DiskInfo[]> {
    return []
  }
}

describe('BaseSystemInfoService', () => {
  beforeEach(() => {
    vi.mocked(os.userInfo).mockReturnValue({ username: 'testuser' } as ReturnType<
      typeof os.userInfo
    >)
  })

  it('returns OS information from the os module', async () => {
    const info = await new TestService().getOsInfo()
    expect(info).toEqual({
      osName: 'Windows 11 Home',
      osVersion: '10.0.26200',
      platform: 'win32',
      arch: 'x64',
      hostname: 'TEST-HOST',
      currentUser: 'testuser'
    })
  })

  it('returns null for the current user when the OS cannot resolve one', async () => {
    // os.userInfo() throws on some stripped-down systems; the requirement is
    // "current user, if available", so the service must degrade to null
    vi.mocked(os.userInfo).mockImplementation(() => {
      throw new Error('no user database')
    })
    const info = await new TestService().getOsInfo()
    expect(info.currentUser).toBeNull()
  })

  it('computes used memory and percentage from total and free', async () => {
    const mem = await new TestService().getMemoryInfo()
    expect(mem.totalBytes).toBe(16 * 1024 ** 3)
    expect(mem.freeBytes).toBe(4 * 1024 ** 3)
    expect(mem.usedBytes).toBe(12 * 1024 ** 3) // total - free
    expect(mem.usedPercentage).toBe(75) // 12/16, rounded
  })
})
