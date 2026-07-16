import type { RefreshInterval } from '../../../shared/types'

const OPTIONS: { label: string; value: RefreshInterval }[] = [
  { label: '1 second', value: 1000 },
  { label: '5 seconds', value: 5000 },
  { label: '10 seconds', value: 10000 },
  { label: 'Manual only', value: null }
]

interface Props {
  value: RefreshInterval
  onChange: (v: RefreshInterval) => void
}

// Controlled component: the selected interval lives in App and arrives via props.
export function RefreshControls({ value, onChange }: Props): React.JSX.Element {
  return (
    <label>
      Auto-refresh:{' '}
      <select
        value={String(value)}
        onChange={(e) =>
          onChange(e.target.value === 'null' ? null : (Number(e.target.value) as RefreshInterval))
        }
      >
        {OPTIONS.map((o) => (
          <option key={o.label} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
