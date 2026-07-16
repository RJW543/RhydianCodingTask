import type { SystemInfoService } from './SystemInfoService'
import { WindowsSystemInfoService } from './platforms/WindowsSystemInfoService'
import { LinuxSystemInfoService } from './platforms/LinuxSystemInfoService'

/**
 * Selects the platform implementation. This is the only place in the app
 * that names concrete platform classes, so adding a platform means one new
 * class and one new case here. The platform is a parameter (defaulting to
 * process.platform) so tests can exercise every branch directly.
 */
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
