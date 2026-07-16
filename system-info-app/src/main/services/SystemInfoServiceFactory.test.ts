import { describe, it, expect } from 'vitest'
import { createSystemInfoService } from './SystemInfoServiceFactory'
import { WindowsSystemInfoService } from './platforms/WindowsSystemInfoService'
import { LinuxSystemInfoService } from './platforms/LinuxSystemInfoService'

// The platform is a parameter (defaulting to process.platform), which is what
// lets these tests exercise every branch without faking globals.
describe('createSystemInfoService', () => {
  it('returns the Windows implementation for win32', () => {
    expect(createSystemInfoService('win32')).toBeInstanceOf(WindowsSystemInfoService)
  })

  it('returns the Linux implementation for linux', () => {
    expect(createSystemInfoService('linux')).toBeInstanceOf(LinuxSystemInfoService)
  })

  it('throws a clear error for an unsupported platform', () => {
    expect(() => createSystemInfoService('darwin')).toThrow('Unsupported platform: darwin')
  })

  it('defaults to the current platform and succeeds on it', () => {
    // whichever machine runs the suite (Windows or Linux) must be supported
    expect(() => createSystemInfoService()).not.toThrow()
  })
})
