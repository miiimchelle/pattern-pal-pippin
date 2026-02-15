import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function ThrowingComponent(): JSX.Element {
  throw new Error('Test explosion')
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('renders fallback UI when child throws', () => {
    // Suppress console.error noise from React
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Close and reopen the plugin to try again.')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('logs error to console', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    )
    expect(spy).toHaveBeenCalled()
    const errorCall = spy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('Pattern Pal error')
    )
    expect(errorCall).toBeTruthy()
    spy.mockRestore()
  })
})
