import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PatternResults } from './PatternResults'
import type { PatternGroup } from '../hooks/usePluginMessages'

function makeGroup(overrides: Partial<PatternGroup> = {}): PatternGroup {
  return {
    fingerprint: 'fp-1',
    frames: [
      {
        id: 'f1',
        name: 'Home',
        width: 375,
        height: 812,
        childCount: 5,
        maxDepth: 3,
        componentIds: [],
        componentNames: ['Button'],
        aspectRatio: 0.46,
        layoutMode: 'VERTICAL',
        cornerRadius: 0,
        hasAutoLayout: true,
        fillCount: 1,
        childTypeDistribution: {},
      },
    ],
    consistency: 85,
    componentUsage: [],
    nameMatches: [],
    libraryMatches: [],
    ...overrides,
  }
}

describe('PatternResults', () => {
  it('renders empty state when no groups', () => {
    render(<PatternResults groups={[]} onFrameClick={vi.fn()} onOpenInFigma={vi.fn()} />)
    expect(screen.getByText('No patterns found')).toBeInTheDocument()
  })

  it('renders group count badge', () => {
    const groups = [makeGroup(), makeGroup({ fingerprint: 'fp-2' })]
    const { container } = render(
      <PatternResults groups={groups} onFrameClick={vi.fn()} onOpenInFigma={vi.fn()} />
    )
    const badge = container.querySelector('.status-count')
    expect(badge?.textContent).toBe('2')
  })

  it('renders frame buttons with name', () => {
    render(<PatternResults groups={[makeGroup()]} onFrameClick={vi.fn()} onOpenInFigma={vi.fn()} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
  })

  it('shows component count when frame has componentNames', () => {
    render(<PatternResults groups={[makeGroup()]} onFrameClick={vi.fn()} onOpenInFigma={vi.fn()} />)
    expect(screen.getByText('1 components')).toBeInTheDocument()
  })

  it('shows consistency badge for groups with 2+ frames', () => {
    const group = makeGroup({
      frames: [
        {
          id: 'f1',
          name: 'A',
          width: 375,
          height: 812,
          childCount: 2,
          maxDepth: 2,
          componentIds: [],
          componentNames: [],
          aspectRatio: 0.46,
          layoutMode: 'VERTICAL',
          cornerRadius: 0,
          hasAutoLayout: true,
          fillCount: 1,
          childTypeDistribution: {},
        },
        {
          id: 'f2',
          name: 'B',
          width: 375,
          height: 812,
          childCount: 2,
          maxDepth: 2,
          componentIds: [],
          componentNames: [],
          aspectRatio: 0.46,
          layoutMode: 'VERTICAL',
          cornerRadius: 0,
          hasAutoLayout: true,
          fillCount: 1,
          childTypeDistribution: {},
        },
      ],
    })
    render(<PatternResults groups={[group]} onFrameClick={vi.fn()} onOpenInFigma={vi.fn()} />)
    expect(screen.getByText('85% consistent')).toBeInTheDocument()
  })

  it('does not show consistency badge for single-frame group', () => {
    render(<PatternResults groups={[makeGroup()]} onFrameClick={vi.fn()} onOpenInFigma={vi.fn()} />)
    expect(screen.queryByText(/consistent/)).toBeNull()
  })

  it('calls onFrameClick with correct args', () => {
    const onFrameClick = vi.fn()
    const group = makeGroup()
    render(<PatternResults groups={[group]} onFrameClick={onFrameClick} onOpenInFigma={vi.fn()} />)
    fireEvent.click(screen.getByText('Home'))
    expect(onFrameClick).toHaveBeenCalledWith('f1', undefined, group)
  })

  it('shows file badge when frame has fileName', () => {
    const group = makeGroup({
      frames: [
        {
          id: 'f1',
          name: 'Card',
          width: 200,
          height: 300,
          childCount: 1,
          maxDepth: 1,
          componentIds: [],
          componentNames: [],
          aspectRatio: 0.67,
          layoutMode: 'NONE',
          cornerRadius: 0,
          hasAutoLayout: false,
          fillCount: 0,
          childTypeDistribution: {},
          fileName: 'Design System',
        },
      ],
    })
    render(<PatternResults groups={[group]} onFrameClick={vi.fn()} onOpenInFigma={vi.fn()} />)
    expect(screen.getByText('Design System')).toBeInTheDocument()
  })

  it('shows dimensions in group header', () => {
    render(<PatternResults groups={[makeGroup()]} onFrameClick={vi.fn()} onOpenInFigma={vi.fn()} />)
    expect(screen.getByText(/375.*812px/)).toBeInTheDocument()
  })
})
