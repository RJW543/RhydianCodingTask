import { systemInfoClient } from '../api/systemInfoClient'
import { usePolledQuery } from '../hooks/usePolledQuery'
import { formatBytes } from '../utils/formatBytes'

interface Props {
  intervalMs: number | null
}

export function DiskPanel({ intervalMs }: Props): React.JSX.Element {
  const { data, error, loading } = usePolledQuery(systemInfoClient.getDiskInfo, intervalMs)

  if (loading) return <section className="panel">Loading disks…</section>
  if (error) return <section className="panel error">Disk information unavailable: {error}</section>
  if (!data || data.length === 0) return <section className="panel">No disks found</section>

  return (
    <section className="panel">
      <h2>Disks</h2>
      {data.map((disk) => (
        <div key={disk.mount} className="disk">
          <h3>{disk.mount}</h3>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${disk.usedPercentage}%` }} />
          </div>
          <p>
            {formatBytes(disk.usedBytes)} used of {formatBytes(disk.totalBytes)} (
            {disk.usedPercentage}%), {formatBytes(disk.freeBytes)} free
          </p>
        </div>
      ))}
    </section>
  )
}
