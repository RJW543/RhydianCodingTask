import type { OsInfo, ProcessInfo, MemoryInfo, DiskInfo, IpcResult } from '../shared/types'

declare global {
  interface Window {
    systemInfo: {
      getOsInfo(): Promise<IpcResult<OsInfo>>
      getProcesses(): Promise<IpcResult<ProcessInfo[]>>
      getMemoryInfo(): Promise<IpcResult<MemoryInfo>>
      getDiskInfo(): Promise<IpcResult<DiskInfo[]>>
    }
  }
}

export {}
