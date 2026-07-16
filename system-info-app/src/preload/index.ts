import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../shared/ipcChannels'
import type { OsInfo, ProcessInfo, MemoryInfo, DiskInfo, IpcResult } from '../shared/types'

// The complete API surface exposed to the page: four functions returning
// IpcResult envelopes. ipcRenderer itself is never exposed.
const systemInfo = {
  getOsInfo: (): Promise<IpcResult<OsInfo>> => ipcRenderer.invoke(IpcChannels.getOsInfo),
  getProcesses: (): Promise<IpcResult<ProcessInfo[]>> =>
    ipcRenderer.invoke(IpcChannels.getProcesses),
  getMemoryInfo: (): Promise<IpcResult<MemoryInfo>> =>
    ipcRenderer.invoke(IpcChannels.getMemoryInfo),
  getDiskInfo: (): Promise<IpcResult<DiskInfo[]>> => ipcRenderer.invoke(IpcChannels.getDiskInfo)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('systemInfo', systemInfo)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.systemInfo = systemInfo
}
