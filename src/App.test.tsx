import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders Pattern Pal header', () => {
    render(<App />)
    expect(screen.getByText('Pattern Pal')).toBeInTheDocument()
    expect(screen.getByText(/Find similar patterns/)).toBeInTheDocument()
  })

  it('renders tab buttons', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Patterns/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reference/i })).toBeInTheDocument()
  })

  it('shows Scan Current Page button on Patterns tab by default', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Scan Current Page/i })).toBeInTheDocument()
  })

  it('switches to Reference tab and shows frame prompt', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Reference/i }))
    expect(screen.getByText(/Select a frame on the canvas/i)).toBeInTheDocument()
  })
})
