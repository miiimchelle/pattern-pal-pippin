import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders Pattern Pal header', () => {
    render(<App />)
    expect(screen.getByText('Pattern Pal')).toBeInTheDocument()
  })

  it('renders settings gear button', () => {
    render(<App />)
    expect(screen.getByTitle('Settings')).toBeInTheDocument()
  })

  it('shows Scan button on frame tab', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /^Scan$/i })).toBeInTheDocument()
  })

  it('shows select frame hint when no frame selected', () => {
    render(<App />)
    expect(screen.getByText(/Select a frame to scan\./)).toBeInTheDocument()
  })

  it('does not show token reminder on frame tab', () => {
    render(<App />)
    expect(screen.queryByText(/Add your Figma token/i)).not.toBeInTheDocument()
  })

  it('shows token reminder on team tab when no token configured', async () => {
    render(<App />)
    await userEvent.click(screen.getByText('Scan team files'))
    expect(screen.getByText(/Add your Figma token/i)).toBeInTheDocument()
  })

  it('disables Scan button on team tab when token/teamId missing', async () => {
    render(<App />)
    await userEvent.click(screen.getByText('Scan team files'))
    expect(screen.getByRole('button', { name: /^Scan$/i })).toBeDisabled()
  })

  it('switches to Settings when gear is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByTitle('Settings'))
    expect(screen.getByText(/Figma Personal Access Token/i)).toBeInTheDocument()
    expect(screen.getByText(/Figma Team ID/i)).toBeInTheDocument()
    expect(screen.getByText(/Save Settings/i)).toBeInTheDocument()
  })

  it('renders both tab buttons', () => {
    render(<App />)
    expect(screen.getByText('Scan frame')).toBeInTheDocument()
    expect(screen.getByText('Scan team files')).toBeInTheDocument()
  })
})
