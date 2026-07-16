import os from 'node:os' //This module provides operating system-related utility methods and properties. It allows you to retrieve information about the operating system, such as its name, version, architecture, and more.
import { BaseSystemInfoService } from '../BaseSystemInfoService' //This is an abstract class that implements the SystemInfoService interface. It provides implementations for the getOsInfo and getMemoryInfo methods, which are identical across all operating systems. The getProcesses and getDiskInfo methods are left as abstract, meaning that subclasses must provide their own implementations for these methods.
import { runCommand } from '../runCommand' //This function runs a command in a child process and returns the output as a string. It takes two parameters: file, which is the path to the executable file to run, and args, which is an array of strings representing the arguments to pass to the command. The function returns a Promise that resolves with the standard output of the command as a string.
import type { ProcessInfo, DiskInfo } from '../../../shared/types' //These are TypeScript type definitions for ProcessInfo and DiskInfo. They define the structure of the objects that will be returned by the getProcesses and getDiskInfo methods, respectively. ProcessInfo contains information about a running process, such as its PID, name, CPU usage, and memory usage. DiskInfo contains information about a disk, such as its name, size, used space, and free space.

//PowerShell outputs should be in JSON format

//Process quering CIM
const PROCESS_QUERY = `
  Get-CimInstance Win32_PerfFormattedData_PerfProc_Process |
  Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } |
  Select-Object IDProcess, Name, PercentProcessorTime, WorkingSet |
  ConvertTo-Json -Compress
`

//Disks (DriveType=3 means local fixed disks, excluding USB sticks and network drives)
//this const holds the PowerShell command to query disk information
const DISK_QUERY = `
  Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' |
  Select-Object DeviceID, Size, FreeSpace |
  ConvertTo-Json -Compress
`
// shape of what the PowerShell JSON gives us, before we map it to our own types
interface RawProcess {
  IDProcess: number
  Name: string
  PercentProcessorTime: number
  WorkingSet: number
}

//This class implements the SystemInfoService interface for the Windows platform. It extends the BaseSystemInfoService class, which provides implementations for the getOsInfo and getMemoryInfo methods. The WindowsSystemInfoService class provides its own implementations for the getProcesses and getDiskInfo methods, which are specific to the Windows operating system.
export class WindowsSystemInfoService extends BaseSystemInfoService {
  async getProcesses(): Promise<ProcessInfo[]> {
    const stdout = await runCommand('powershell.exe', ['-NoProfile', '-Command', PROCESS_QUERY])
    return parseWindowsProcesses(stdout, os.cpus().length)
  }

  //This function parses the output of the PowerShell command that retrieves process information. It takes two parameters: stdout, which is the standard output of the command as a string, and cpuCount, which is the number of CPU cores on the system. The function returns an array of ProcessInfo objects, which contain information about each running process.
  async getDiskInfo(): Promise<DiskInfo[]> {
    const stdout = await runCommand('powershell.exe', ['-NoProfile', '-Command', DISK_QUERY])
    return parseWindowsDisks(stdout)
  }
}

// exported pure functions so tests can feed them canned strings directly
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
    // PercentProcessorTime is summed across cores, so 800% is possible on 8 cores
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
    // skip drives that report no size (e.g. empty card readers), also avoids dividing by zero
    if (typeof r.Size !== 'number' || r.Size <= 0) return []
    const freeBytes = r.FreeSpace ?? 0 // ?? means: use 0 if FreeSpace is null or undefined
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
