//lists what methods an implementing class must provide and compiles to nothing. This one
//defines the four operations for reading system information.
//Platform abstraction means hiding the messy differences behind one stable front.
// The SystemInfoService interface is the front as
// it promises what can be done (get processes, get disks) and says nothing about how

//How it is used:
// - One class implements this contract per supported platform
//   (e.g. WindowsSystemInfoService), each fetching the data with
//   its own OS commands.
// - The factory inspects process.platform at startup and constructs
//   the right implementation.
// - Everything downstream (the IPC handlers that serve the renderer)
//  depends only on this contract and never names a platform class,
//  so supporting a new OS means one new class and one new factory
//   case, with no changes to existing code.

// All methods return Promises (values that arrive later) because the
// data comes from running OS commands, which must not block the app.

import type { OsInfo, ProcessInfo, MemoryInfo, DiskInfo } from '../../shared/types'

export interface SystemInfoService {
  getOsInfo(): Promise<OsInfo> //function that returns a promise of OsInfo, which is an object containing information about the operating system
  getProcesses(): Promise<ProcessInfo[]> //function that returns a promise of an array of ProcessInfo, which is an object containing information about the running processes
  getMemoryInfo(): Promise<MemoryInfo> //function that returns a promise of MemoryInfo, which is an object containing information about the system's memory usage
  getDiskInfo(): Promise<DiskInfo[]> //function that returns a promise of an array of DiskInfo, which is an object containing information about the system's disks
}
