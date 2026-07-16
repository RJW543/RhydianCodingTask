import { describe, it, expect, vi } from 'vitest'

// Mock the command runner so no PowerShell ever runs during tests.
vi.mock('../runCommand', () => ({ runCommand: vi.fn() }))

import { runCommand } from '../runCommand'
import {
  WindowsSystemInfoService,
  parseWindowsProcesses,
  parseWindowsDisks
} from './WindowsSystemInfoService'

// Fixtures shaped like real ConvertTo-Json output, recorded from a Windows 11 machine.
const PROCESS_JSON =
  '[{"IDProcess":19512,"Name":"SearchIndexer","PercentProcessorTime":32,"WorkingSet":80465920},' +
  '{"IDProcess":5320,"Name":"MBAMService","PercentProcessorTime":16,"WorkingSet":88088576}]'

// ConvertTo-Json emits a bare object (no array brackets) when there is exactly one result.
const SINGLE_PROCESS_JSON =
  '{"IDProcess":4,"Name":"System","PercentProcessorTime":0,"WorkingSet":15728640}'

const DISK_JSON =
  '[{"DeviceID":"C:","Size":659200000000,"FreeSpace":22100000000},' +
  '{"DeviceID":"E:","Size":null,"FreeSpace":null}]' // e.g. an empty card reader

describe('parseWindowsProcesses', () => {
  it('maps PowerShell records to ProcessInfo, dividing CPU by core count', () => {
    const procs = parseWindowsProcesses(PROCESS_JSON, 8)
    expect(procs).toEqual([
      { pid: 19512, name: 'SearchIndexer', cpuPercentage: 4, memoryBytes: 80465920 },
      { pid: 5320, name: 'MBAMService', cpuPercentage: 2, memoryBytes: 88088576 }
    ])
  })

  it('handles the single-result quirk where JSON is an object, not an array', () => {
    const procs = parseWindowsProcesses(SINGLE_PROCESS_JSON, 8)
    expect(procs).toHaveLength(1)
    expect(procs[0].name).toBe('System')
  })

  it('throws a clear error when the output is not JSON', () => {
    expect(() => parseWindowsProcesses('PowerShell exploded', 8)).toThrow(
      'Unexpected output from PowerShell when listing processes'
    )
  })
})

describe('parseWindowsDisks', () => {
  it('maps disk records and computes used bytes and percentage', () => {
    const disks = parseWindowsDisks(DISK_JSON)
    expect(disks).toHaveLength(1) // the null-size drive must be skipped
    expect(disks[0]).toEqual({
      mount: 'C:',
      totalBytes: 659200000000,
      freeBytes: 22100000000,
      usedBytes: 637100000000,
      usedPercentage: 97
    })
  })

  it('handles the single-result quirk', () => {
    const disks = parseWindowsDisks('{"DeviceID":"C:","Size":1000,"FreeSpace":250}')
    expect(disks[0].usedPercentage).toBe(75)
  })

  it('throws a clear error when the output is not JSON', () => {
    expect(() => parseWindowsDisks('<not json>')).toThrow(
      'Unexpected output from PowerShell when listing disks'
    )
  })
})

describe('WindowsSystemInfoService', () => {
  it('retrieves and parses the process list via the command runner', async () => {
    vi.mocked(runCommand).mockResolvedValue(PROCESS_JSON)
    const procs = await new WindowsSystemInfoService().getProcesses()
    expect(runCommand).toHaveBeenCalledWith('powershell.exe', [
      '-NoProfile',
      '-Command',
      expect.stringContaining('Win32_PerfFormattedData_PerfProc_Process')
    ])
    expect(procs.map((p) => p.pid)).toEqual([19512, 5320])
  })

  it('retrieves and parses disk information via the command runner', async () => {
    vi.mocked(runCommand).mockResolvedValue(DISK_JSON)
    const disks = await new WindowsSystemInfoService().getDiskInfo()
    expect(disks.map((d) => d.mount)).toEqual(['C:'])
  })

  it('propagates command failures so the IPC layer can report them', async () => {
    vi.mocked(runCommand).mockRejectedValue(new Error('powershell.exe not found'))
    await expect(new WindowsSystemInfoService().getProcesses()).rejects.toThrow(
      'powershell.exe not found'
    )
  })
})
