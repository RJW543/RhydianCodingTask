//unwraps the envelope so components deal in plain data, and gives tests a single thing to fake
import type { OsInfo, ProcessInfo, MemoryInfo, DiskInfo, IpcResult } from '../../../shared/types' //import the types from the shared/types file

//unwraps the envelope so components deal in plain data, and gives tests a single thing to fake
function unwrap<T>(result: IpcResult<T>): T {
  if (!result.ok) throw new Error(result.error)
  return result.data
}

// the systemInfoClient object provides methods to retrieve system information from the main process via IPC
export const systemInfoClient = {
  getOsInfo: async (): Promise<OsInfo> => unwrap(await window.systemInfo.getOsInfo()),
  getProcesses: async (): Promise<ProcessInfo[]> => unwrap(await window.systemInfo.getProcesses()),
  getMemoryInfo: async (): Promise<MemoryInfo> => unwrap(await window.systemInfo.getMemoryInfo()),
  getDiskInfo: async (): Promise<DiskInfo[]> => unwrap(await window.systemInfo.getDiskInfo())
}