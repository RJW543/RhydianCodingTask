import { describe, it, expect, vi } from 'vitest'

// Mock the command runner and the file read so no real ps/df/os-release is touched.
// The fs mock also provides a default export because Vitest's interop for node:
// builtins expects one even when only named imports are used.
vi.mock('../runCommand', () => ({ runCommand: vi.fn() }))
vi.mock('node:fs/promises', () => {
  const readFile = vi.fn()
  return { readFile, default: { readFile } }
})

import { readFile } from 'node:fs/promises'
import os from 'node:os'
import { runCommand } from '../runCommand'
import {
  LinuxSystemInfoService,
  parseLinuxProcesses,
  parseLinuxDisks,
  parsePrettyName
} from './LinuxSystemInfoService'

// Fixture shaped like `ps -eo pid=,pcpu=,rss=,comm=` output (no header, name last).
const PS_OUTPUT = `
      1  0.0  12345 systemd
    536  0.5  98764 systemd-journal
  73082 50.3 139968 node
short line
   1234  1.4   2048 Web Content
`

// Fixture shaped like `df -kP` output: header line, real device, pseudo filesystems.
const DF_OUTPUT = `Filesystem     1024-blocks      Used Available Capacity Mounted on
/dev/sdc        1055762868   2831148 999237336       1% /
tmpfs              3947216         0   3947216       0% /mnt/wsl
none               3947216        12   3947212       1% /usr/lib/wsl/drivers
`

const OS_RELEASE = `PRETTY_NAME="Ubuntu 24.04.2 LTS"
NAME="Ubuntu"
VERSION_ID="24.04"
`

describe('parseLinuxProcesses', () => {
  it('maps ps output to ProcessInfo, converting rss KB to bytes', () => {
    const procs = parseLinuxProcesses(PS_OUTPUT)
    expect(procs[0]).toEqual({
      pid: 1,
      name: 'systemd',
      cpuPercentage: 0,
      memoryBytes: 12345 * 1024
    })
    expect(procs[2]).toEqual({
      pid: 73082,
      name: 'node',
      cpuPercentage: 50, // 50.3 rounded
      memoryBytes: 139968 * 1024
    })
  })

  it('skips malformed lines rather than failing the whole list', () => {
    const names = parseLinuxProcesses(PS_OUTPUT).map((p) => p.name)
    expect(names).not.toContain('short')
    expect(names).toHaveLength(4)
  })

  it('keeps process names that contain spaces intact', () => {
    const procs = parseLinuxProcesses(PS_OUTPUT)
    expect(procs[3].name).toBe('Web Content')
  })

  it('returns an empty list for empty output', () => {
    expect(parseLinuxProcesses('')).toEqual([])
  })
})

describe('parseLinuxDisks', () => {
  it('parses real devices and converts 1024-byte blocks to bytes', () => {
    const disks = parseLinuxDisks(DF_OUTPUT)
    expect(disks).toHaveLength(1) // tmpfs and none are pseudo filesystems, skipped
    expect(disks[0]).toEqual({
      mount: '/',
      totalBytes: 1055762868 * 1024,
      usedBytes: 2831148 * 1024,
      freeBytes: 999237336 * 1024,
      usedPercentage: 0 // 2.8 GB of 1 TB rounds to 0
    })
  })

  it('returns an empty list when df produces only a header', () => {
    expect(parseLinuxDisks('Filesystem 1024-blocks Used Available Capacity Mounted on\n')).toEqual(
      []
    )
  })
})

describe('parsePrettyName', () => {
  it('extracts PRETTY_NAME without its quotes', () => {
    expect(parsePrettyName(OS_RELEASE)).toBe('Ubuntu 24.04.2 LTS')
  })

  it('returns null when the key is absent', () => {
    expect(parsePrettyName('NAME="Ubuntu"\nVERSION_ID="24.04"\n')).toBeNull()
  })
})

describe('LinuxSystemInfoService', () => {
  it('upgrades the OS name from /etc/os-release when available', async () => {
    vi.mocked(readFile).mockResolvedValue(OS_RELEASE)
    const info = await new LinuxSystemInfoService().getOsInfo()
    expect(info.osName).toBe('Ubuntu 24.04.2 LTS')
    expect(info.hostname).toBe(os.hostname()) // everything else still comes from the base
  })

  it('falls back to the base OS name when os-release is unreadable', async () => {
    // the cosmetic upgrade must never become a new failure mode
    vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'))
    const info = await new LinuxSystemInfoService().getOsInfo()
    expect(info.osName).toBe(os.version())
  })

  it('retrieves and parses the process list via the command runner', async () => {
    vi.mocked(runCommand).mockResolvedValue(PS_OUTPUT)
    const procs = await new LinuxSystemInfoService().getProcesses()
    expect(runCommand).toHaveBeenCalledWith('ps', ['-eo', 'pid=,pcpu=,rss=,comm='])
    expect(procs).toHaveLength(4)
  })

  it('retrieves and parses disk information via the command runner', async () => {
    vi.mocked(runCommand).mockResolvedValue(DF_OUTPUT)
    const disks = await new LinuxSystemInfoService().getDiskInfo()
    expect(runCommand).toHaveBeenCalledWith('df', ['-kP'])
    expect(disks.map((d) => d.mount)).toEqual(['/'])
  })
})
