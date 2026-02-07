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

  it('renders settings gear button', () => {
    render(<App />)
    expect(screen.getByTitle('Settings')).toBeInTheDocument()
  })

  it('shows Scan Current Page button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Scan Current Page/i })).toBeInTheDocument()
  })

  it('shows token reminder when no token configured', () => {
    render(<App />)
    expect(screen.getByText(/Add your Figma token/i)).toBeInTheDocument()
  })

  it('switches to Settings when gear is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Settings'))
    expect(screen.getByText(/Figma Personal Access Token/i)).toBeInTheDocument()
    expect(screen.getByText(/Figma Team ID/i)).toBeInTheDocument()
    expect(screen.getByText(/Save Settings/i)).toBeInTheDocument()
  })

  it('does not show Scan Team Files button without token and teamId', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: /Scan Team Files/i })).not.toBeInTheDocument()
  })
})
