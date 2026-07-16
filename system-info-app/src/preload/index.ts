import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IpcChannels } from '../shared/ipcChannels'
import type { OsInfo, ProcessInfo, MemoryInfo, DiskInfo, IpcResult } from '../shared/types'

// Custom APIs for renderer
const api = {}

// the ONLY functions the web page is allowed to call; ipcRenderer itself is never exposed
const systemInfo = {
  getOsInfo: (): Promise<IpcResult<OsInfo>> => ipcRenderer.invoke(IpcChannels.getOsInfo),
  getProcesses: (): Promise<IpcResult<ProcessInfo[]>> => ipcRenderer.invoke(IpcChannels.getProcesses),
  getMemoryInfo: (): Promise<IpcResult<MemoryInfo>> => ipcRenderer.invoke(IpcChannels.getMemoryInfo),
  getDiskInfo: (): Promise<IpcResult<DiskInfo[]>> => ipcRenderer.invoke(IpcChannels.getDiskInfo)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('systemInfo', systemInfo)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.systemInfo = systemInfo
}