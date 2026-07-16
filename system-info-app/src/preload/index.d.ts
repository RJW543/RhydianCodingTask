import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    systemInfo: {
    getOsInfo(): Promise<IpcResult<OsInfo>>
    getProcesses(): Promise<IpcResult<ProcessInfo[]>>
    getMemoryInfo(): Promise<IpcResult<MemoryInfo>>
    getDiskInfo(): Promise<IpcResult<DiskInfo[]>>
    }
  }
}
