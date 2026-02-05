import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app with Hero', () => {
    render(<App />)
    expect(screen.getByText('INTO DESIGN')).toBeInTheDocument()
  })

  it('renders corner decorations', () => {
    render(<App />)
    expect(screen.getByText('v2.0.26')).toBeInTheDocument()
    expect(screen.getByText('MUNICH')).toBeInTheDocument()
  })
})
