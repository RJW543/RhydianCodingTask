import type { SystemInfoService } from './SystemInfoService'
import { WindowsSystemInfoService } from './platforms/WindowsSystemInfoService'
import { LinuxSystemInfoService } from './platforms/LinuxSystemInfoService'

//this function is a factory that creates an instance of the appropriate SystemInfoService implementation based on the current platform. It takes an optional platform parameter, which defaults to the current platform (process.platform). If the platform is 'win32', it returns a new instance of WindowsSystemInfoService. If the platform is not supported, it throws an error.
export function createSystemInfoService(
  platform: NodeJS.Platform = process.platform
): SystemInfoService {
  switch (platform) {
    case 'win32':
      return new WindowsSystemInfoService()
    case 'linux':
       return new LinuxSystemInfoService()
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}
