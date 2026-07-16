// NOTE TO SELF: this file is the Linux "worker" behind the SystemInfoService interface.
// The factory picks this class when process.platform is 'linux'. It inherits the
// cross-platform bits (memory, and the default OS info) from BaseSystemInfoService and
// only implements what genuinely differs on Linux: processes, disks, and a nicer OS name.
// The parse functions live at the bottom as EXPORTED PURE FUNCTIONS (same input, same
// output, no side effects) so my tests can call them directly with saved command output
// without ever running a real command.

import { BaseSystemInfoService } from '../BaseSystemInfoService' // the abstract parent; I extend it and fill in its two abstract gaps
import { runCommand } from '../runCommand' // my one helper for running OS commands; tests replace this with a fake
import { readFile } from 'node:fs/promises' // promise-based file reading, used for /etc/os-release (a file, not a command)
import type { OsInfo, ProcessInfo, DiskInfo } from '../../../shared/types' // 'import type' = these vanish at compile time, they are just my checklists

//extends the BaseSystemInfoService class to provide Linux-specific implementations for retrieving process and disk information.
// It uses system commands like 'ps' and 'df' to gather this data, which is then parsed into the appropriate types.
export class LinuxSystemInfoService extends BaseSystemInfoService {
  // override = deliberately replacing the method inherited from the base class.
  // The base version works everywhere but on Linux os.version() is the ugly kernel
  // build string, so we refine just the osName using /etc/os-release when available.
  // Remember: the 'override' keyword makes TypeScript CHECK that a method with this
  // name really exists on the parent, so a typo here becomes a compile error instead
  // of me silently adding a second, never-called method.
  override async getOsInfo(): Promise<OsInfo> {
    const base = await super.getOsInfo() // super = call the parent class's version first
    // I start from the parent's answer and only improve one field. If ANYTHING below
    // goes wrong I still return valid data, so this override can never introduce a
    // new failure mode. That is the pattern: refine, do not replace wholesale.
    try {
      const content = await readFile('/etc/os-release', 'utf8') // standard file on modern distros describing the OS
      const prettyName = parsePrettyName(content)
      if (prettyName !== null) {
        // explicit null check (not just 'if (prettyName)') because I want "missing"
        // to be the only reason to skip, and this reads as exactly that
        return { ...base, osName: prettyName } // copy of base with just osName swapped
        // the ...base spread copies every field of base into a NEW object, then
        // osName after it wins. base itself is never mutated.
      }
    } catch {
      // file missing or unreadable: keep the base default,
      // a cosmetic upgrade must never become a new way to fail
    }
    return base
  }

  async getProcesses(): Promise<ProcessInfo[]> {
    // '=' after each column name suppresses the header row;
    // comm (the process name) goes LAST because names can contain spaces
    // A raw output line looks like:  "  1  0.0  12345 systemd"
    // i.e. pid, cpu %, memory in KB, then the name. Everything is async (Promise =
    // a value that arrives later) because running a command takes real time and the
    // app must not freeze while waiting.
    const stdout = await runCommand('ps', ['-eo', 'pid=,pcpu=,rss=,comm='])
    return parseLinuxProcesses(stdout)
    // note the shape: one line to fetch, one line to parse. Keeping "run" and "parse"
    // separate is what makes the parser testable on its own.
  }

  //gets disk information by running the 'df' command with specific flags to format the output,
  // then parses that output into an array of DiskInfo objects.
  async getDiskInfo(): Promise<DiskInfo[]> {
    // -k = sizes in 1024-byte blocks, -P = POSIX format (guarantees one line per disk)
    // without -P, df is allowed to wrap long device names onto two lines, which would
    // wreck a line-by-line parser. -P exists precisely to stop that.
    const stdout = await runCommand('df', ['-kP'])
    return parseLinuxDisks(stdout)
  }
}

//parsePrettyName extracts the human-readable OS name from /etc/os-release,
// which is KEY=VALUE lines; we want: PRETTY_NAME="Ubuntu 24.04.2 LTS"
// Returns string OR null (never throws): null means "not found, caller keeps its
// default". A missing cosmetic field is not an error worth failing over.
export function parsePrettyName(osRelease: string): string | null {
  for (const line of osRelease.split('\n')) {
    const trimmed = line.trim() // trim = strip leading/trailing whitespace so indented lines still match
    if (trimmed.startsWith('PRETTY_NAME=')) {
      return trimmed.slice('PRETTY_NAME='.length).replace(/^"|"$/g, '') // strip surrounding quotes
      // slice cuts off the 'PRETTY_NAME=' prefix; the regex /^"|"$/g means: a quote at
      // the very start (^") OR (|) a quote at the very end ("$), g = replace all matches,
      // so "Ubuntu 24.04.2 LTS" becomes Ubuntu 24.04.2 LTS without touching inner quotes
    }
  }
  return null
}

//parseLinuxProcesses takes the stdout from the 'ps' command and converts it into an array of ProcessInfo objects.
// Reminder of the overall approach: split into lines, throw away anything that does not
// look like a process row, and convert the survivors. Bad lines are SKIPPED, not fatal,
// because one weird process name should never blank the whole table.
export function parseLinuxProcesses(stdout: string): ProcessInfo[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      // flatMap = a map that can also DROP items: returning [] contributes nothing
      // to the final array, returning [thing] contributes one item. That is how the
      // guard clauses below quietly discard malformed lines.
      const parts = line.split(/\s+/) // split on any run of whitespace
      if (parts.length < 4) return [] // malformed line: skip rather than crash
      const pid = Number(parts[0]) // Number() converts text to a number, giving NaN (not-a-number) if it fails
      const cpu = Number(parts[1])
      const rssKb = Number(parts[2]) // rss = resident set size, the process's RAM in KB
      if ([pid, cpu, rssKb].some(Number.isNaN)) return [] // .some = "is at least one of these NaN?" -> if so the line was not numeric, skip it
      return [
        {
          pid,
          name: parts.slice(3).join(' '), // everything after the numbers is the name
          cpuPercentage: Math.round(cpu), // ps gives decimals like 0.5; my type promises whole numbers
          memoryBytes: rssKb * 1024 // KB -> bytes, because my ProcessInfo stores raw bytes and the UI formats them
        }
      ]
    })
}

//parseLinuxDisks takes the stdout from the 'df' command and converts it into an array of DiskInfo objects,
// filtering out non-device filesystems and handling potential parsing errors.
export function parseLinuxDisks(stdout: string): DiskInfo[] {
  const lines = stdout.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)
  // first line is the header (Filesystem 1024-blocks Used Available Capacity Mounted on)
  // hence lines.slice(1) below: slice(1) = everything except index 0, i.e. skip the header
  return lines.slice(1).flatMap((line) => {
    const parts = line.split(/\s+/)
    if (parts.length < 6) return []
    // only real devices; skips pseudo filesystems like tmpfs, proc and snap loop mounts
    // (Linux lists lots of fake "disks"; anything not starting /dev/ is not real storage)
    if (!parts[0].startsWith('/dev/')) return []
    const totalBytes = Number(parts[1]) * 1024 // df -k reports 1024-byte blocks, so *1024 converts to bytes
    const usedBytes = Number(parts[2]) * 1024
    const freeBytes = Number(parts[3]) * 1024
    if ([totalBytes, usedBytes, freeBytes].some(Number.isNaN) || totalBytes <= 0) return []
    // the totalBytes <= 0 guard also protects the division below from a divide-by-zero
    return [
      {
        mount: parts.slice(5).join(' '), // mount point is last and may contain spaces
        totalBytes,
        usedBytes,
        freeBytes,
        usedPercentage: Math.round((usedBytes / totalBytes) * 100)
        // I compute the percentage myself instead of trusting df's Capacity column so
        // "used %" means exactly the same thing on Linux as it does on Windows
      }
    ]
  })
}
