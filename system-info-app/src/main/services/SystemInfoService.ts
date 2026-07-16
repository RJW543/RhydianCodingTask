import type { OsInfo, ProcessInfo, MemoryInfo, DiskInfo } from '../../shared/types'

/**
 * Contract for retrieving system information - the platform abstraction.
 *
 * One class implements this contract per supported platform, and the factory
 * selects which one at runtime. Everything downstream (the IPC handlers that
 * serve the renderer) depends only on this contract and never names a
 * platform class, so supporting a new OS means one new implementation and
 * one new factory case, with no changes to existing code.
 *
 * All methods are async because the data comes from running OS commands,
 * which must not block the app.
 */
export interface SystemInfoService {
  getOsInfo(): Promise<OsInfo>
  getProcesses(): Promise<ProcessInfo[]>
  getMemoryInfo(): Promise<MemoryInfo>
  getDiskInfo(): Promise<DiskInfo[]>
}
