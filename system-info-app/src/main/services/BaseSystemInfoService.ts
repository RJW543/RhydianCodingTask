// an abstract class, delibertley half finshed (will be finsihed by subclassses)
//implements the two methods that are identicle on every OS
// implements it via the os module, and leaving the two that differ as gap
//The abstract methods make the compiler refuse any platform class that forgets processes or disks.


import os from 'node:os'
import type { SystemInfoService } from './SystemInfoService'
import type { OsInfo, MemoryInfo, ProcessInfo, DiskInfo } from '../../shared/types'

//function that returns a promise of OsInfo, which is an object containing information about the operating system, it does this asynchronously
export abstract class BaseSystemInfoService implements SystemInfoService {
  async getOsInfo(): Promise<OsInfo> {
    let currentUser: string | null = null // variable to hold the current user, initialised to null
    try {
      currentUser = os.userInfo().username
    } catch {
      // os.userInfo() can throw on stripped-down systems; the brief says "if available", so null is the honest answer
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
    const totalBytes= os.totalmem()
    const freeBytes = os.freemem()
    const usedBytes = (totalBytes - freeBytes)
    return {
        totalBytes,
        freeBytes,
        usedBytes,
        usedPercentage: Math.round((usedBytes / totalBytes) * 100)
    
    }
}

// no implementation here: each platform subclass must provide these
abstract getProcesses(): Promise<ProcessInfo[]>
abstract getDiskInfo(): Promise<DiskInfo[]>
}
