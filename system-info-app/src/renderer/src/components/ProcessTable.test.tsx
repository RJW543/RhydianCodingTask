import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProcessTable, filterProcesses, sortProcesses } from './ProcessTable'
import { systemInfoClient } from '../api/systemInfoClient'
import type { ProcessInfo } from '../../../shared/types'

vi.mock('../api/systemInfoClient', () => ({
  systemInfoClient: { getProcesses: vi.fn() }
}))

const processes: ProcessInfo[] = [
  { pid: 100, name: 'alpha', cpuPercentage: 10, memoryBytes: 50 * 1024 ** 2 },
  { pid: 200, name: 'middleweight', cpuPercentage: 50, memoryBytes: 300 * 1024 ** 2 },
  { pid: 300, name: 'zulu', cpuPercentage: 1, memoryBytes: 10 * 1024 ** 2 }
]

// The sorting and filtering logic is pure, so it gets direct unit tests
// independent of any rendering.
describe('filterProcesses', () => {
  it('matches case-insensitively on the name', () => {
    expect(filterProcesses(processes, 'ZU')).toEqual([processes[2]])
  })

  it('returns everything for a blank search', () => {
    expect(filterProcesses(processes, '   ')).toEqual(processes)
  })
})

describe('sortProcesses', () => {
  it('sorts numerically by CPU descending', () => {
    const sorted = sortProcesses(processes, 'cpuPercentage', true)
    expect(sorted.map((p) => p.name)).toEqual(['middleweight', 'alpha', 'zulu'])
  })

  it('sorts alphabetically by name ascending', () => {
    const sorted = sortProcesses(processes, 'name', false)
    expect(sorted.map((p) => p.name)).toEqual(['alpha', 'middleweight', 'zulu'])
  })

  it('does not mutate the input array', () => {
    const copy = [...processes]
    sortProcesses(processes, 'pid', true)
    expect(processes).toEqual(copy)
  })
})

describe('ProcessTable', () => {
  beforeEach(() => {
    vi.mocked(systemInfoClient.getProcesses).mockReset()
    vi.mocked(systemInfoClient.getProcesses).mockResolvedValue(processes)
  })

  // helper: names of the rendered rows, in order, ignoring the header row
  function rowNames(): string[] {
    const rows = within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')
    return rows.map((row) => within(row).getAllByRole('cell')[1].textContent ?? '')
  }

  it('renders one row per process, sorted by CPU descending by default', async () => {
    render(<ProcessTable intervalMs={null} />)
    expect(await screen.findByText('Processes (3)')).toBeTruthy()
    expect(rowNames()).toEqual(['middleweight', 'alpha', 'zulu'])
  })

  it('filters rows as the user types', async () => {
    const user = userEvent.setup()
    render(<ProcessTable intervalMs={null} />)
    await screen.findByText('Processes (3)')

    await user.type(screen.getByPlaceholderText('Filter by name…'), 'zu')
    expect(screen.getByText('Processes (1)')).toBeTruthy()
    expect(rowNames()).toEqual(['zulu'])
  })

  it('re-sorts when a header is clicked, and flips direction on a second click', async () => {
    const user = userEvent.setup()
    render(<ProcessTable intervalMs={null} />)
    await screen.findByText('Processes (3)')

    await user.click(screen.getByText('Name')) // new column starts descending
    expect(rowNames()).toEqual(['zulu', 'middleweight', 'alpha'])

    await user.click(screen.getByText('Name')) // same column flips to ascending
    expect(rowNames()).toEqual(['alpha', 'middleweight', 'zulu'])
  })

  it('fetches again when the manual refresh button is clicked', async () => {
    const user = userEvent.setup()
    render(<ProcessTable intervalMs={null} />)
    await screen.findByText('Processes (3)')

    await user.click(screen.getByText('Refresh now'))
    expect(systemInfoClient.getProcesses).toHaveBeenCalledTimes(2)
  })

  it('shows the error state when the fetch fails', async () => {
    vi.mocked(systemInfoClient.getProcesses).mockRejectedValue(new Error('ps missing'))
    render(<ProcessTable intervalMs={null} />)
    expect(await screen.findByText('Processes unavailable: ps missing')).toBeTruthy()
  })
})
