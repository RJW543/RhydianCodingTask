/** Single source of truth for IPC channel names; main and preload must match exactly. */
export const IpcChannels = {
  getOsInfo: 'system:get-os-info',
  getProcesses: 'system:get-processes',
  getMemoryInfo: 'system:get-memory-info',
  getDiskInfo: 'system:get-disk-info'
} as const
