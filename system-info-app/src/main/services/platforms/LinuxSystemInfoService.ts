import { readFile } from 'node:fs/promises'
import { BaseSystemInfoService } from '../BaseSystemInfoService'
import { runCommand } from '../runCommand'
import type { OsInfo, ProcessInfo, DiskInfo } from '../../../shared/types'

/**
 * Linux implementation: processes via ps, disks via df, plus a cosmetic
 * refinement of the OS name. Parsers are exported pure functions so tests
 * can feed them recorded command output.
 */
export class LinuxSystemInfoService extends BaseSystemInfoService {
  // The inherited implementation works, but on Linux os.version() is the
  // kernel build string. Refine just osName from /etc/os-release when
  // available, keeping the base default otherwise: a cosmetic upgrade must
  // never become a new failure mode.
  override async getOsInfo(): Promise<OsInfo> {
    const base = await super.getOsInfo()
    try {
      const content = await readFile('/etc/os-release', 'utf8')
      const prettyName = parsePrettyName(content)
      if (prettyName !== null) {
        return { ...base, osName: prettyName }
      }
    } catch {
      // /etc/os-release missing or unreadable: fall back to the base default
    }
    return base
  }

  async getProcesses(): Promise<ProcessInfo[]> {
    // '=' after each column suppresses the header row; comm (the process
    // name) goes last because names can contain spaces
    const stdout = await runCommand('ps', ['-eo', 'pid=,pcpu=,rss=,comm='])
    return parseLinuxProcesses(stdout)
  }

  async getDiskInfo(): Promise<DiskInfo[]> {
    // -k = sizes in 1024-byte blocks; -P = POSIX format, which guarantees
    // one line per disk instead of wrapping long device names
    const stdout = await runCommand('df', ['-kP'])
    return parseLinuxDisks(stdout)
  }
}

/** Extracts PRETTY_NAME="..." from /etc/os-release content; null when absent. */
export function parsePrettyName(osRelease: string): string | null {
  for (const line of osRelease.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('PRETTY_NAME=')) {
      return trimmed.slice('PRETTY_NAME='.length).replace(/^"|"$/g, '')
    }
  }
  return null
}

export function parseLinuxProcesses(stdout: string): ProcessInfo[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      const parts = line.split(/\s+/)
      if (parts.length < 4) return [] // malformed line: skip it rather than fail the whole list
      const pid = Number(parts[0])
      const cpu = Number(parts[1])
      const rssKb = Number(parts[2]) // rss = resident set size, in KB
      if ([pid, cpu, rssKb].some(Number.isNaN)) return []
      return [
        {
          pid,
          name: parts.slice(3).join(' '), // everything after the numeric columns
          cpuPercentage: Math.round(cpu),
          memoryBytes: rssKb * 1024
        }
      ]
    })
}

export function parseLinuxDisks(stdout: string): DiskInfo[] {
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  // skip the header line (Filesystem 1024-blocks Used Available Capacity Mounted on)
  return lines.slice(1).flatMap((line) => {
    const parts = line.split(/\s+/)
    if (parts.length < 6) return []
    // real devices only: skips pseudo filesystems such as tmpfs, proc and snap loop mounts
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
        // computed rather than read from df's Capacity column so "used %"
        // means the same thing on every platform
        usedPercentage: Math.round((usedBytes / totalBytes) * 100)
      }
    ]
  })
}
