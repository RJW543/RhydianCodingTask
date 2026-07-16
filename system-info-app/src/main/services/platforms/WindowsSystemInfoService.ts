import os from 'node:os'
import { BaseSystemInfoService } from '../BaseSystemInfoService'
import { runCommand } from '../runCommand'
import type { ProcessInfo, DiskInfo } from '../../../shared/types'

// Both queries ask PowerShell for JSON output (ConvertTo-Json) so parsing is
// JSON.parse rather than splitting text columns. -NoProfile skips the user's
// PowerShell startup scripts, keeping runs fast and predictable.

const PROCESS_QUERY = `
  Get-CimInstance Win32_PerfFormattedData_PerfProc_Process |
  Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } |
  Select-Object IDProcess, Name, PercentProcessorTime, WorkingSet |
  ConvertTo-Json -Compress
`

// DriveType=3 restricts the list to local fixed disks (no USB sticks or network drives)
const DISK_QUERY = `
  Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' |
  Select-Object DeviceID, Size, FreeSpace |
  ConvertTo-Json -Compress
`

/** Shape of the raw PowerShell JSON records, before mapping to our own types. */
interface RawProcess {
  IDProcess: number
  Name: string
  PercentProcessorTime: number
  WorkingSet: number
}

export class WindowsSystemInfoService extends BaseSystemInfoService {
  async getProcesses(): Promise<ProcessInfo[]> {
    const stdout = await runCommand('powershell.exe', ['-NoProfile', '-Command', PROCESS_QUERY])
    return parseWindowsProcesses(stdout, os.cpus().length)
  }

  async getDiskInfo(): Promise<DiskInfo[]> {
    const stdout = await runCommand('powershell.exe', ['-NoProfile', '-Command', DISK_QUERY])
    return parseWindowsDisks(stdout)
  }
}

// Parsers are exported pure functions so tests can feed them canned strings.

export function parseWindowsProcesses(stdout: string, coreCount: number): ProcessInfo[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    throw new Error('Unexpected output from PowerShell when listing processes')
  }
  // ConvertTo-Json returns a bare object (not an array) when there is exactly one result
  const records = (Array.isArray(parsed) ? parsed : [parsed]) as RawProcess[]
  return records.map((r) => ({
    pid: r.IDProcess,
    name: r.Name,
    // PercentProcessorTime is summed across cores (800% possible on 8 cores),
    // so divide by the core count to get a 0-100 value
    cpuPercentage: Math.round(r.PercentProcessorTime / coreCount),
    memoryBytes: r.WorkingSet
  }))
}

interface RawDisk {
  DeviceID: string
  Size: number | null
  FreeSpace: number | null
}

export function parseWindowsDisks(stdout: string): DiskInfo[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    throw new Error('Unexpected output from PowerShell when listing disks')
  }
  // ConvertTo-Json returns a bare object (not an array) when there is exactly one result
  const records = (Array.isArray(parsed) ? parsed : [parsed]) as RawDisk[]

  return records.flatMap((r) => {
    // skip drives that report no size (e.g. empty card readers); also guards the division below
    if (typeof r.Size !== 'number' || r.Size <= 0) return []
    const freeBytes = r.FreeSpace ?? 0
    const usedBytes = r.Size - freeBytes
    return [
      {
        mount: r.DeviceID,
        totalBytes: r.Size,
        freeBytes,
        usedBytes,
        usedPercentage: Math.round((usedBytes / r.Size) * 100)
      }
    ]
  })
}
