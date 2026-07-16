import { useState } from 'react'
import type { RefreshInterval } from '../../shared/types'
import { OsInfoPanel } from './components/OsInfoPanel'
import { MemoryPanel } from './components/MemoryPanel'
import { DiskPanel } from './components/DiskPanel'
import { ProcessTable } from './components/ProcessTable'
import { RefreshControls } from './components/RefreshControls'

// the App component is the root component of the application. 
// It manages the auto-refresh interval state and renders the various panels displaying system information.
function App(): React.JSX.Element {
  const [intervalMs, setIntervalMs] = useState<RefreshInterval>(5000)

  return (
    <div className="app">
      <header>
        <h1>System Information</h1>
        <RefreshControls value={intervalMs} onChange={setIntervalMs} />
      </header>
      <OsInfoPanel />
      <MemoryPanel intervalMs={intervalMs} />
      <DiskPanel intervalMs={intervalMs} />
      <ProcessTable intervalMs={intervalMs} />
    </div>
  )
}

export default App