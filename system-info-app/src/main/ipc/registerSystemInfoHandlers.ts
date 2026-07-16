import { ipcMain } from 'electron'
import { IpcChannels } from '../../shared/ipcChannels'
import type { IpcResult } from '../../shared/types'
import type { SystemInfoService } from '../services/SystemInfoService'

//runs a service call and converts success or failure into an IpcResult meaning that the renderer can always expect a result object with an ok property and either data or error
async function wrap<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// the service arrives as a parameter (dependency injection) so tests can pass a fake
export function registerSystemInfoHandlers(service: SystemInfoService): void {
  ipcMain.handle(IpcChannels.getOsInfo, () => wrap(() => service.getOsInfo()))
  ipcMain.handle(IpcChannels.getProcesses, () => wrap(() => service.getProcesses()))
  ipcMain.handle(IpcChannels.getMemoryInfo, () => wrap(() => service.getMemoryInfo()))
  ipcMain.handle(IpcChannels.getDiskInfo, () => wrap(() => service.getDiskInfo()))
}