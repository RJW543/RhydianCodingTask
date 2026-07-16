import os from 'node:os'
import type { SystemInfoService } from './SystemInfoService'
import type { OsInfo, MemoryInfo, ProcessInfo, DiskInfo } from '../../shared/types'

/**
 * The platform-independent half of the SystemInfoService contract,
 * implemented once via Node's os module. Processes and disks genuinely
 * differ per platform, so they are declared abstract and the compiler
 * forces every platform subclass to provide them.
 */
export abstract class BaseSystemInfoService implements SystemInfoService {
  async getOsInfo(): Promise<OsInfo> {
    let currentUser: string | null = null
    try {
      currentUser = os.userInfo().username
    } catch {
      // os.userInfo() can throw on stripped-down systems; the requirement is
      // "current user, if available", so null is the honest answer
    }
    return {
      osName: os.version(),
      osVersion: os.release(),
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      currentUser
    }
  }

  async getMemoryInfo(): Promise<MemoryInfo> {
    const totalBytes = os.totalmem()
    const freeBytes = os.freemem()
    const usedBytes = totalBytes - freeBytes
    return {
      totalBytes,
      freeBytes,
      usedBytes,
      usedPercentage: Math.round((usedBytes / totalBytes) * 100)
    }
  }

  abstract getProcesses(): Promise<ProcessInfo[]>
  abstract getDiskInfo(): Promise<DiskInfo[]>
}
