import type { OsInfo, ProcessInfo, MemoryInfo, DiskInfo, IpcResult } from '../../../shared/types'

// Thin client over the preload bridge: unwraps the IpcResult envelope so
// components deal in plain data (or a thrown Error). Tests mock this object
// as the single seam between the UI and the bridge.
function unwrap<T>(result: IpcResult<T>): T {
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export const systemInfoClient = {
  getOsInfo: async (): Promise<OsInfo> => unwrap(await window.systemInfo.getOsInfo()),
  getProcesses: async (): Promise<ProcessInfo[]> => unwrap(await window.systemInfo.getProcesses()),
  getMemoryInfo: async (): Promise<MemoryInfo> => unwrap(await window.systemInfo.getMemoryInfo()),
  getDiskInfo: async (): Promise<DiskInfo[]> => unwrap(await window.systemInfo.getDiskInfo())
}
