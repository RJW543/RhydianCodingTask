import type { RefreshInterval } from '../../../shared/types'

// a component that allows the user to select an auto-refresh interval for the system information displayed in the app.
const OPTIONS: { label: string; value: RefreshInterval }[] = [
  { label: '1 second', value: 1000 },
  { label: '5 seconds', value: 5000 },
  { label: '10 seconds', value: 10000 },
  { label: 'Manual only', value: null }
]

// the Props interface defines the expected props for the RefreshControls component, including the current value and a callback function to handle changes.
interface Props {
  value: RefreshInterval
  onChange: (v: RefreshInterval) => void
}


// the RefreshControls component renders a dropdown menu that allows the user to select an auto-refresh interval. 
// It calls the onChange callback whenever the selected value changes.
export function RefreshControls({ value, onChange }: Props): React.JSX.Element {
  return (
    <label>
      Auto-refresh:{' '}
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value === 'null' ? null : (Number(e.target.value) as RefreshInterval))}
      >
        {OPTIONS.map((o) => (
          <option key={o.label} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}