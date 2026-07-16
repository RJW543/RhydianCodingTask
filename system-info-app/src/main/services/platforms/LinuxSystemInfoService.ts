import { BaseSystemInfoService } from '../BaseSystemInfoService'
import { runCommand } from '../runCommand'
import type { ProcessInfo, DiskInfo } from '../../../shared/types'

//extends the BaseSystemInfoService class to provide Linux-specific implementations for retrieving process and disk information. 
// It uses system commands like 'ps' and 'df' to gather this data, which is then parsed into the appropriate types.
export class LinuxSystemInfoService extends BaseSystemInfoService {
  async getProcesses(): Promise<ProcessInfo[]> {
    // '=' after each column name suppresses the header row;
    // comm (the process name) goes LAST because names can contain spaces
    const stdout = await runCommand('ps', ['-eo', 'pid=,pcpu=,rss=,comm='])
    return parseLinuxProcesses(stdout)
  }

  //gets disk information by running the 'df' command with specific flags to format the output, 
  // then parses that output into an array of DiskInfo objects.
  async getDiskInfo(): Promise<DiskInfo[]> {
    // -k = sizes in 1024-byte blocks, -P = POSIX format (guarantees one line per disk)
    const stdout = await runCommand('df', ['-kP'])
    return parseLinuxDisks(stdout)
  }
}

//parseLinuxProcesses takes the stdout from the 'ps' command and converts it into an array of ProcessInfo objects.
export function parseLinuxProcesses(stdout: string): ProcessInfo[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      const parts = line.split(/\s+/) // split on any run of whitespace
      if (parts.length < 4) return [] // malformed line: skip rather than crash
      const pid = Number(parts[0])
      const cpu = Number(parts[1])
      const rssKb = Number(parts[2]) // rss = resident set size, the process's RAM in KB
      if ([pid, cpu, rssKb].some(Number.isNaN)) return []
      return [
        {
          pid,
          name: parts.slice(3).join(' '), // everything after the numbers is the name
          cpuPercentage: Math.round(cpu),
          memoryBytes: rssKb * 1024
        }
      ]
    })
}

//parseLinuxDisks takes the stdout from the 'df' command and converts it into an array of DiskInfo objects, 
// filtering out non-device filesystems and handling potential parsing errors.
export function parseLinuxDisks(stdout: string): DiskInfo[] {
  const lines = stdout.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)
  // first line is the header (Filesystem 1024-blocks Used Available Capacity Mounted on)
  return lines.slice(1).flatMap((line) => {
    const parts = line.split(/\s+/)
    if (parts.length < 6) return []
    // only real devices; skips pseudo filesystems like tmpfs, proc and snap loop mounts
    if (!parts[0].startsWith('/dev/')) return []
    const totalBytes = Number(parts[1]) * 1024
    const usedBytes = Number(parts[2]) * 1024
    const freeBytes = Number(parts[3]) * 1024
    if ([totalBytes, usedBytes, freeBytes].some(Number.isNaN) || totalBytes <= 0) return []
    return [
      {
        mount: parts.slice(5).join(' '), // mount point is last and may contain spaces
        totalBytes,
        usedBytes,
        freeBytes,
        usedPercentage: Math.round((usedBytes / totalBytes) * 100)
      }
    ]
  })
}