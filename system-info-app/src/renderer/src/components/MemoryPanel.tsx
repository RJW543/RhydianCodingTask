import { systemInfoClient } from '../api/systemInfoClient'
import { usePolledQuery } from '../hooks/usePolledQuery'
import { formatBytes } from '../utils/formatBytes'

interface Props {
  intervalMs: number | null
}

export function MemoryPanel({ intervalMs }: Props): React.JSX.Element {
  const { data, error, loading } = usePolledQuery(systemInfoClient.getMemoryInfo, intervalMs)

  if (loading) return <section className="panel">Loading memory…</section>
  if (error) return <section className="panel error">Memory unavailable: {error}</section>
  if (!data) return <section className="panel" />

  return (
    <section className="panel">
      <h2>Memory</h2>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${data.usedPercentage}%` }} />
      </div>
      <p>
        {formatBytes(data.usedBytes)} used of {formatBytes(data.totalBytes)} ({data.usedPercentage}
        %)
      </p>
    </section>
  )
}
