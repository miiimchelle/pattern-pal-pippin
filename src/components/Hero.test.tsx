import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Hero from './Hero'

describe('Hero', () => {
  it('renders hackathon title', () => {
    render(<Hero />)
    expect(screen.getByText('INTO DESIGN')).toBeInTheDocument()
    expect(screen.getByText('HACKATHON')).toBeInTheDocument()
    expect(screen.getByText('2026')).toBeInTheDocument()
  })

  it('renders Denkwerk branding', () => {
    render(<Hero />)
    expect(screen.getByText('DENK')).toBeInTheDocument()
    expect(screen.getByText('WERK')).toBeInTheDocument()
  })

  it('renders vibe coding tag', () => {
    render(<Hero />)
    expect(screen.getByText('</> VIBE CODING ENABLED')).toBeInTheDocument()
  })
})
