import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('test setup', () => {
  it('renders a component', () => {
    render(<h1>hello</h1>)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })
})
