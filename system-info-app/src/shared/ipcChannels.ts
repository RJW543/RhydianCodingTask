// single source of truth for channel names (a channel is the named "letterbox"
// a message is posted through; both sides must use identical strings)
export const IpcChannels = {
  getOsInfo: 'system:get-os-info',
  getProcesses: 'system:get-processes',
  getMemoryInfo: 'system:get-memory-info',
  getDiskInfo: 'system:get-disk-info'
} as const // as const freezes these as exact strings, not just "some string"