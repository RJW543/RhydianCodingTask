import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// React Testing Library only auto-unmounts between tests when test globals are
// enabled; this project keeps globals off (explicit imports), so cleanup is
// registered here instead. Without it, rendered components accumulate across
// tests and queries start finding duplicates.
afterEach(() => {
  cleanup()
})
