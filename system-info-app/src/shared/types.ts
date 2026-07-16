/**
 * Shared type contracts for data crossing the IPC boundary.
 * Imported by both main (which produces the data) and renderer (which
 * consumes it), so this file must stay free of Node, Electron and React
 * imports.
 */

export interface OsInfo {
  osName: string // e.g. 'Windows 11 Home', 'Ubuntu 24.04.2 LTS'
  osVersion: string // e.g. '10.0.26200', '6.6.87-microsoft-standard-WSL2'
  platform: string // Node identifier: 'win32', 'linux', 'darwin'
  arch: string // e.g. 'x64', 'arm64'
  hostname: string
  currentUser: string | null // null when the OS cannot resolve a user
}

export interface ProcessInfo {
  pid: number // unique per process; also used as the React list key
  name: string
  cpuPercentage: number // 0-100
  memoryBytes: number // raw bytes; formatted into MB/GB by the renderer
}

// All four values are provided even though two are derivable: the service
// computes everything once, so the renderer does no arithmetic and every
// panel shows consistent numbers.
export interface MemoryInfo {
  totalBytes: number
  freeBytes: number
  usedBytes: number // totalBytes - freeBytes
  usedPercentage: number // 0-100
}

export interface DiskInfo {
  mount: string // e.g. 'C:' on Windows, '/' on Linux
  totalBytes: number
  freeBytes: number
  usedBytes: number
  usedPercentage: number // 0-100
}

/** Auto-refresh period in milliseconds; null means manual refresh only. */
export type RefreshInterval = 1000 | 5000 | 10000 | null

/** Envelope for every IPC reply: success with data, or failure with a message. */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }
