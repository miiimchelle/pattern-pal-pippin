import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TeamFileResults } from './TeamFileResults'
import type { TeamFileResult } from '../hooks/usePluginMessages'

function makeFileResult(overrides: Partial<TeamFileResult> = {}): TeamFileResult {
  return {
    fileKey: 'abc123',
    fileName: 'Design File',
    consistency: 85,
    matches: [
      {
        teamFrameId: '1:2',
        teamFrameName: 'Home Screen',
        localFrameId: 'local-1',
        localFrameName: 'My Screen',
        similarity: 78,
      },
    ],
    ...overrides,
  }
}

describe('TeamFileResults', () => {
  it('renders empty state when no results', () => {
    render(<TeamFileResults fileResults={[]} onOpenInFigma={vi.fn()} />)
    expect(screen.getByText('No similar frames found in other team files.')).toBeInTheDocument()
  })

  it('renders file name button', () => {
    render(<TeamFileResults fileResults={[makeFileResult()]} onOpenInFigma={vi.fn()} />)
    expect(screen.getByText('Design File')).toBeInTheDocument()
  })

  it('shows consistency badge', () => {
    render(<TeamFileResults fileResults={[makeFileResult()]} onOpenInFigma={vi.fn()} />)
    expect(screen.getByText('85% consistent')).toBeInTheDocument()
  })

  it('renders match frame name and similarity', () => {
    render(<TeamFileResults fileResults={[makeFileResult()]} onOpenInFigma={vi.fn()} />)
    expect(screen.getByText('Home Screen')).toBeInTheDocument()
    expect(screen.getByText('78%')).toBeInTheDocument()
  })

  it('calls onOpenInFigma with file URL when file name clicked', () => {
    const onOpen = vi.fn()
    render(<TeamFileResults fileResults={[makeFileResult()]} onOpenInFigma={onOpen} />)
    fireEvent.click(screen.getByText('Design File'))
    expect(onOpen).toHaveBeenCalledWith('https://www.figma.com/file/abc123')
  })

  it('calls onOpenInFigma with node URL when match clicked', () => {
    const onOpen = vi.fn()
    render(<TeamFileResults fileResults={[makeFileResult()]} onOpenInFigma={onOpen} />)
    fireEvent.click(screen.getByText('Home Screen'))
    expect(onOpen).toHaveBeenCalledWith('https://www.figma.com/design/abc123?node-id=1-2')
  })

  it('applies green color class for high consistency', () => {
    const { container } = render(
      <TeamFileResults
        fileResults={[makeFileResult({ consistency: 95 })]}
        onOpenInFigma={vi.fn()}
      />
    )
    const badge = container.querySelector('.bg-green-100')
    expect(badge).toBeTruthy()
  })

  it('applies red color class for low consistency', () => {
    const { container } = render(
      <TeamFileResults
        fileResults={[makeFileResult({ consistency: 30 })]}
        onOpenInFigma={vi.fn()}
      />
    )
    const badge = container.querySelector('.bg-red-100')
    expect(badge).toBeTruthy()
  })
})
