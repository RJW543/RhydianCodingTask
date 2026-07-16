import { systemInfoClient } from '../api/systemInfoClient'
import { usePolledQuery } from '../hooks/usePolledQuery'

export function OsInfoPanel(): React.JSX.Element {
  // interval is null: OS details do not change while the app runs, so fetch once
  const { data, error, loading } = usePolledQuery(systemInfoClient.getOsInfo, null)

  if (loading) return <section className="panel">Loading OS information…</section>
  if (error) return <section className="panel error">OS information unavailable: {error}</section>
  if (!data) return <section className="panel" />

  return (
    <section className="panel">
      <h2>Operating System</h2>
      <dl>
        <dt>Name</dt>
        <dd>{data.osName}</dd>
        <dt>Version</dt>
        <dd>{data.osVersion}</dd>
        <dt>Platform / architecture</dt>
        <dd>
          {data.platform} / {data.arch}
        </dd>
        <dt>Hostname</dt>
        <dd>{data.hostname}</dd>
        <dt>Current user</dt>
        <dd>{data.currentUser ?? 'Not available'}</dd>
      </dl>
    </section>
  )
}