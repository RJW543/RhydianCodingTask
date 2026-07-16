import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RefreshControls } from './RefreshControls'

describe('RefreshControls', () => {
  it('offers the four required interval options', () => {
    render(<RefreshControls value={5000} onChange={() => {}} />)
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['1 second', '5 seconds', '10 seconds', 'Manual only'])
  })

  it('reports a numeric interval when one is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RefreshControls value={5000} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox'), '1000')
    expect(onChange).toHaveBeenCalledWith(1000)
  })

  it('reports null when Manual only is selected', async () => {
    // null is the contract for "stop polling"; the string 'null' from the DOM
    // must be converted back, which is exactly what this guards
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<RefreshControls value={5000} onChange={onChange} />)

    await user.selectOptions(screen.getByRole('combobox'), 'null')
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
