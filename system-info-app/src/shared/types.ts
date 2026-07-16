//Shared type contracts (the checklists both halves of the app agree to follow)
// for data crossing the IPC (IPC is the system to post messages beween the backend and frontend) boundary.
//Imported by both main, which produces the data (backend builds the OsInfo, ProcessInfo) and renderer
//(which consumes it), so this file must stay free of Node,
//Electron and React imports.

//Needed: OsInfo, ProcessInfo, MemoryInfo, DiskInfo, RefreshInterval

//any object calling itself an OsInfo must have an osName that is text,
// an osVersion that is text, a hostname that is text etc
export interface OsInfo {
  osName: string // e.g. Windows 10, macOS, Linux
  osVersion: string // e.g. 10.0.19042, 11.2.3, 5.4.0-42-generic
  platform: string // e.g. win32, darwin, linux
  arch: string // e.g. x64, arm64, ia32
  hostname: string // e.g. DESKTOP-12345, MacBook-Pro, ubuntu-server
  currentUser: string | null // e.g. john
}

export interface ProcessInfo {
  pid: number // the process id which is needed to identify processes running
  name: string //needed for human identification/filtering
  cpuPercentage: number // needed for sorting/filtering by CPU usage
  memoryBytes: number // needed for sorting/filtering by memory usage, will be assigned a GB value at render time
}

export interface MemoryInfo {
  totalBytes: number // total physical memory in bytes
  freeBytes: number // free physical memory in bytes
  usedBytes: number // computed from totalBytes - freeBytes
  usedPercentage: number // computed from usedBytes / totalBytes * 100
}
//all 4 stored for reducnancy,  the service computes everything once, and the renderer does zero arithmetic, it only displays.

export interface DiskInfo {
  mount: string // e.g. C:\, /, /home
  totalBytes: number
  freeBytes: number
  usedBytes: number
  usedPercentage: number
}

export type RefreshInterval = 1000 | 5000 | 10000 | null
