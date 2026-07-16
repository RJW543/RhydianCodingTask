# Plan: System Information Desktop App

Written before starting the implementation. This is my thinking on how I will structure
the app, why, and how the pieces will talk to each other.

## Goal

An Electron + React desktop app that shows OS information, running processes (with
auto-refresh at a user-chosen interval), memory usage and disk usage, on at least two
platforms (I am targeting Windows and Linux). The design should make adding a third
platform straightforward.

## Decisions I am making up front

1. **No REST API.** The natural boundary in Electron is IPC (inter-process communication:
   typed messages between the Node backend "main" process and the browser "renderer"
   window). Adding an HTTP server would be REST for its own sake, so I will use IPC only.
2. **No `systeminformation` npm package.** It would cover the functional requirements,
   but it does the platform branching internally, which leaves nothing for my own platform
   abstraction to do, and that abstraction is the core of the task. I will use Node's
   built-in `os` module plus `child_process` to run OS commands, with my own parsers.
3. **Windows + Linux.** I develop on Windows and can verify Linux under WSL2. On Windows I
   will query system data through PowerShell (`Get-CimInstance`) rather than `wmic`, which
   is removed from newer Windows 11. I will ask PowerShell for JSON output so parsing is
   `JSON.parse` rather than splitting text columns. On Linux I will use `ps` and `df -kP`.
4. **Polling happens in the renderer.** A React hook with `setInterval` calling across IPC
   is simpler to write and test than pushing data from main. "Manual only" refresh is just
   a null interval.
5. **All byte values cross the boundary as raw numbers.** Formatting into "12.4 GB" is
   presentation, so it happens in the renderer at display time only. The main process
   computes derived values (used bytes, percentages) once, so the UI does zero arithmetic.

## Architecture

Four layers, with a shared contracts folder they all agree on:

```
src/
  shared/     types.ts (data shapes), ipcChannels.ts (channel name constants)
  main/       services/ (the platform abstraction) + ipc/ (handlers) + main entry
  preload/    the bridge: the only place renderer and main are connected
  renderer/   React UI: api client, hooks, components
```

The platform abstraction lives in `main/services`:

- `SystemInfoService` — an interface (a contract listing methods, no implementation):
  getOsInfo, getProcesses, getMemoryInfo, getDiskInfo, all returning Promises.
- `BaseSystemInfoService` — an abstract class implementing the two methods that are the
  same everywhere via Node's `os` module (OS info, memory), leaving processes and disks
  abstract for subclasses.
- `WindowsSystemInfoService`, `LinuxSystemInfoService` — one per platform, each running
  its own commands and parsing the output. Parsers will be exported pure functions so
  tests can feed them recorded command output.
- `SystemInfoServiceFactory` — the single place that knows concrete classes exist. Takes
  a platform string (defaults to `process.platform`) and returns the matching service, or
  throws for unsupported platforms. Adding macOS later = one new class + one new case.

The renderer never learns which platform it is on. It calls four functions exposed by the
preload bridge, and those are the only functions the page gets (no `ipcRenderer`, no Node).

Errors: handlers catch service failures and return an envelope
`{ ok: true, data } | { ok: false, error }` so the renderer always receives something
typed and displayable, never a mangled exception.

## Pseudocode for the core pieces

```
interface SystemInfoService:
    getOsInfo() -> OsInfo
    getProcesses() -> ProcessInfo[]
    getMemoryInfo() -> MemoryInfo
    getDiskInfo() -> DiskInfo[]

factory(platform = current platform):
    win32 -> new WindowsSystemInfoService
    linux -> new LinuxSystemInfoService
    else  -> throw "Unsupported platform"

windows getProcesses:
    stdout = run powershell (CIM process query, JSON output)
    return parse(stdout)          # parse is a pure function, unit tested

ipc handler for each channel:
    try:    return { ok: true, data: await service.method() }
    catch:  return { ok: false, error: message }

preload bridge:
    expose exactly four functions to the page,
    each one invokes its IPC channel and returns the envelope

renderer api client:
    call bridge, unwrap envelope: return data or throw error

usePolledQuery(fetcher, intervalMs):
    state: data, error, loading
    on mount: fetch once
    if intervalMs is not null: fetch every intervalMs (skip if a fetch is in flight)
    on unmount or interval change: clear the timer
    return { data, error, loading, refresh }

App:
    holds the selected RefreshInterval (1s / 5s / 10s / null)
    renders OsInfoPanel (fetch once), MemoryPanel, DiskPanel, ProcessTable
    ProcessTable: local sort + filter state, pure sort/filter functions, manual
    refresh button wired to the hook's refresh
```

## How the pieces interact (example data flow)

User picks "5 seconds" and the process table refreshes:

1. `RefreshControls` calls back to `App`, which stores `5000` in state and passes it down.
2. `ProcessTable`'s `usePolledQuery` sees a new interval, resets its timer, and every 5s
   calls the api client's `getProcesses`.
3. The client calls `window.systemInfo.getProcesses()` — a function the preload script
   exposed via `contextBridge`.
4. Preload invokes IPC channel `system:get-processes`.
5. In main, `ipcMain.handle` for that channel runs. It calls `service.getProcesses()` on
   whatever the factory built at startup (on my machine: the Windows service).
6. The Windows service runs PowerShell, gets JSON, and its parser maps the records into
   `ProcessInfo[]` (pid, name, cpuPercentage, memoryBytes).
7. The handler wraps it: `{ ok: true, data: [...] }`, which travels back over IPC.
8. The client unwraps the envelope and returns the array; the hook stores it in state.
9. React re-renders the table; sort and filter are applied to the fresh data locally.

If PowerShell fails at step 6, the handler catches and returns
`{ ok: false, error: "..." }`; the client throws, the hook stores the message, and the
panel shows an error line instead of a table. Nothing crashes.

## Testing approach

- Factory: right class per platform string, throws on unsupported ones.
- Parsers: pure functions fed recorded real command output (fixtures), plus garbage input
  expecting a clear error, plus the PowerShell single-result quirk (object, not array).
- Base service: OS info and memory shapes, with `os` mocked, including the "no user
  available" path.
- Hook: fake timers — fetches on mount, refetches on interval, stops on null, manual
  refresh works.
- Components: React Testing Library with a mocked api client — renders data, loading and
  error states, filter narrows rows, header click sorts, changing interval changes polling.

## Build order

Scaffold (electron-vite, React + TS template, Vitest + React Testing Library), then shared
type contracts, then services (interface, base, Windows, factory), then the IPC layer and
preload bridge, then the renderer (hook, client, panels), then the Linux service, then
tests, then README with architecture notes and a class + sequence diagram. Each step gets
committed separately so the history reads as increments.
