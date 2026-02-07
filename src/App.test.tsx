import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders Pattern Pal header', () => {
    render(<App />)
    expect(screen.getByText('Pattern Pal')).toBeInTheDocument()
    expect(screen.getByText(/Find similar patterns/)).toBeInTheDocument()
  })

  it('renders Scan button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Scan Current Page/i })).toBeInTheDocument()
  })
})
