import { ipcMain } from 'electron'
import { IpcChannels } from '../../shared/ipcChannels'
import type { IpcResult } from '../../shared/types'
import type { SystemInfoService } from '../services/SystemInfoService'

/**
 * Runs a service call and converts the outcome into an IpcResult, so the
 * renderer always receives a typed success-or-failure envelope rather than
 * an exception mangled by the IPC boundary.
 */
async function wrap<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Registers one handler per channel. The service arrives as a parameter
 * (dependency injection) so tests can register a fake implementation.
 */
export function registerSystemInfoHandlers(service: SystemInfoService): void {
  ipcMain.handle(IpcChannels.getOsInfo, () => wrap(() => service.getOsInfo()))
  ipcMain.handle(IpcChannels.getProcesses, () => wrap(() => service.getProcesses()))
  ipcMain.handle(IpcChannels.getMemoryInfo, () => wrap(() => service.getMemoryInfo()))
  ipcMain.handle(IpcChannels.getDiskInfo, () => wrap(() => service.getDiskInfo()))
}
