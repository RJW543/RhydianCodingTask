import { useState } from 'react'
import type { ProcessInfo } from '../../../shared/types'
import { systemInfoClient } from '../api/systemInfoClient'
import { usePolledQuery } from '../hooks/usePolledQuery'
import { formatBytes } from '../utils/formatBytes'

type SortKey = 'pid' | 'name' | 'cpuPercentage' | 'memoryBytes' // the keys of ProcessInfo that we want to sort by

// exported pure functions so tests can call them directly
export function filterProcesses(procs: ProcessInfo[], search: string): ProcessInfo[] {
  const term = search.trim().toLowerCase()
  return term ? procs.filter((p) => p.name.toLowerCase().includes(term)) : procs
}

//sortProcesses takes an array of ProcessInfo objects, a key to sort by, and a boolean indicating whether to sort in descending order. 
// It returns a new array of ProcessInfo objects sorted according to the specified key and order.
export function sortProcesses(procs: ProcessInfo[], key: SortKey, descending: boolean): ProcessInfo[] {
  const sorted = [...procs].sort((a, b) =>
    key === 'name' ? a.name.localeCompare(b.name) : (a[key] as number) - (b[key] as number)
  )
  return descending ? sorted.reverse() : sorted
}

// the ProcessTable component displays a table of processes, allowing the user to search and sort them. It uses the usePolledQuery hook to fetch process data at a specified interval.
interface Props {
  intervalMs: number | null
  onManualRefreshReady?: never // (nothing; manual refresh handled below)
}

//this component displays a table of processes, allowing the user to search and sort them. 
// It uses the usePolledQuery hook to fetch process data at a specified interval.
export function ProcessTable({ intervalMs }: Props): React.JSX.Element {
  const { data, error, loading, refresh } = usePolledQuery(systemInfoClient.getProcesses, intervalMs)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('cpuPercentage')
  const [descending, setDescending] = useState(true)

  //this function handles clicks on the table headers to sort the processes by the specified key. 
  // If the same column is clicked again, it toggles the sort order between ascending and descending.
  const headerClick = (key: SortKey): void => {
    if (key === sortKey) setDescending(!descending) // same column: flip direction
    else {
      setSortKey(key)
      setDescending(true)
    }
}

// the component renders a search input, a refresh button, and a table of processes.
if (loading) return <section className="panel">Loading processes…</section>
  if (error) return <section className="panel error">Processes unavailable: {error}</section>

  const rows = sortProcesses(filterProcesses(data ?? [], search), sortKey, descending)

//html structure of the component, including a search input, a refresh button, and a table displaying the filtered and sorted processes.
    return (
    <section className="panel">
      <h2>Processes ({rows.length})</h2>
      <div className="controls">
        <input placeholder="Filter by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button onClick={() => void refresh()}>Refresh now</button>
      </div>
      <table>
        <thead>
          <tr>
            <th onClick={() => headerClick('pid')}>PID</th>
            <th onClick={() => headerClick('name')}>Name</th>
            <th onClick={() => headerClick('cpuPercentage')}>CPU %</th>
            <th onClick={() => headerClick('memoryBytes')}>Memory</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.pid}>
              <td>{p.pid}</td>
              <td>{p.name}</td>
              <td>{p.cpuPercentage}</td>
              <td>{formatBytes(p.memoryBytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}