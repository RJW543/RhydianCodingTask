import { useState } from 'react'
import type { ProcessInfo } from '../../../shared/types'
import { systemInfoClient } from '../api/systemInfoClient'
import { usePolledQuery } from '../hooks/usePolledQuery'
import { formatBytes } from '../utils/formatBytes'

type SortKey = 'pid' | 'name' | 'cpuPercentage' | 'memoryBytes'

// Sorting and filtering are pure functions, exported so tests can call them directly.

export function filterProcesses(procs: ProcessInfo[], search: string): ProcessInfo[] {
  const term = search.trim().toLowerCase()
  return term ? procs.filter((p) => p.name.toLowerCase().includes(term)) : procs
}

export function sortProcesses(
  procs: ProcessInfo[],
  key: SortKey,
  descending: boolean
): ProcessInfo[] {
  const sorted = [...procs].sort((a, b) =>
    key === 'name' ? a.name.localeCompare(b.name) : (a[key] as number) - (b[key] as number)
  )
  return descending ? sorted.reverse() : sorted
}

interface Props {
  intervalMs: number | null
}

export function ProcessTable({ intervalMs }: Props): React.JSX.Element {
  const { data, error, loading, refresh } = usePolledQuery(
    systemInfoClient.getProcesses,
    intervalMs
  )
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('cpuPercentage')
  const [descending, setDescending] = useState(true)

  // clicking the current sort column flips direction; a new column starts descending
  const headerClick = (key: SortKey): void => {
    if (key === sortKey) setDescending(!descending)
    else {
      setSortKey(key)
      setDescending(true)
    }
  }

  if (loading) return <section className="panel">Loading processes…</section>
  if (error) return <section className="panel error">Processes unavailable: {error}</section>

  const rows = sortProcesses(filterProcesses(data ?? [], search), sortKey, descending)

  return (
    <section className="panel">
      <h2>Processes ({rows.length})</h2>
      <div className="controls">
        <input
          placeholder="Filter by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
