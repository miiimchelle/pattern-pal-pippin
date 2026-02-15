import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FrameDetailPanel } from './FrameDetailPanel'
import type { FrameDetail, PatternGroup } from '../hooks/usePluginMessages'

function makeFrame(overrides: Partial<FrameDetail> = {}): FrameDetail {
  return {
    id: 'f1',
    name: 'Login Screen',
    width: 375,
    height: 812,
    cornerRadius: 8,
    padding: { top: 16, right: 16, bottom: 16, left: 16 },
    gap: 12,
    layoutMode: 'VERTICAL',
    childLayers: [
      { name: 'Header', type: 'FRAME' },
      { name: 'Input', type: 'INSTANCE' },
    ],
    fills: ['#FFFFFF'],
    depth: 4,
    ...overrides,
  }
}

function makeGroup(overrides: Partial<PatternGroup> = {}): PatternGroup {
  return {
    fingerprint: 'fp-1',
    frames: [
      {
        id: 'f1',
        name: 'Login Screen',
        width: 375,
        height: 812,
        childCount: 2,
        maxDepth: 4,
        componentIds: [],
        componentNames: [],
        aspectRatio: 0.46,
        layoutMode: 'VERTICAL',
        cornerRadius: 8,
        hasAutoLayout: true,
        fillCount: 1,
        childTypeDistribution: {},
      },
      {
        id: 'f2',
        name: 'Register Screen',
        width: 375,
        height: 812,
        childCount: 3,
        maxDepth: 4,
        componentIds: [],
        componentNames: [],
        aspectRatio: 0.46,
        layoutMode: 'VERTICAL',
        cornerRadius: 8,
        hasAutoLayout: true,
        fillCount: 1,
        childTypeDistribution: {},
        fileKey: 'abc',
        fileName: 'Auth Flows',
      },
    ],
    consistency: 90,
    componentUsage: [],
    nameMatches: [],
    libraryMatches: [],
    ...overrides,
  }
}

describe('FrameDetailPanel', () => {
  it('renders frame name in header', () => {
    render(
      <FrameDetailPanel frame={makeFrame()} group={null} onBack={vi.fn()} onOpenInFigma={vi.fn()} />
    )
    expect(screen.getByText('Login Screen')).toBeInTheDocument()
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(
      <FrameDetailPanel frame={makeFrame()} group={null} onBack={onBack} onOpenInFigma={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Back to results' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('shows structural details', () => {
    render(
      <FrameDetailPanel frame={makeFrame()} group={null} onBack={vi.fn()} onOpenInFigma={vi.fn()} />
    )
    expect(screen.getByText('Structure')).toBeInTheDocument()
    expect(screen.getByText(/375 × 812px/)).toBeInTheDocument()
    expect(screen.getByText('VERTICAL')).toBeInTheDocument()
    expect(screen.getByText('12px')).toBeInTheDocument()
    expect(screen.getByText('16px')).toBeInTheDocument() // uniform padding
    expect(screen.getByText('8px')).toBeInTheDocument() // corner radius
  })

  it('shows child layers', () => {
    render(
      <FrameDetailPanel frame={makeFrame()} group={null} onBack={vi.fn()} onOpenInFigma={vi.fn()} />
    )
    expect(screen.getByText('Layers (2)')).toBeInTheDocument()
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('FRAME')).toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('INSTANCE')).toBeInTheDocument()
  })

  it('shows consistency badge when group provided', () => {
    render(
      <FrameDetailPanel
        frame={makeFrame()}
        group={makeGroup()}
        onBack={vi.fn()}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(screen.getByText('90%')).toBeInTheDocument()
  })

  it('shows grouped frames excluding current frame', () => {
    render(
      <FrameDetailPanel
        frame={makeFrame()}
        group={makeGroup()}
        onBack={vi.fn()}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(screen.getByText(/Grouped with.*1 other frame/)).toBeInTheDocument()
    expect(screen.getByText('Register Screen')).toBeInTheDocument()
    expect(screen.getByText('Auth Flows')).toBeInTheDocument()
  })

  it('uses frameName prop when frame is null', () => {
    render(
      <FrameDetailPanel
        frame={null}
        group={null}
        frameName="Fallback Name"
        onBack={vi.fn()}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(screen.getByText('Fallback Name')).toBeInTheDocument()
  })

  it('shows "None" for zero corner radius', () => {
    render(
      <FrameDetailPanel
        frame={makeFrame({ cornerRadius: 0 })}
        group={null}
        onBack={vi.fn()}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('formats mixed corner radius array', () => {
    render(
      <FrameDetailPanel
        frame={makeFrame({ cornerRadius: [8, 8, 0, 0] })}
        group={null}
        onBack={vi.fn()}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(screen.getByText('8px, 8px, 0px, 0px')).toBeInTheDocument()
  })

  it('shows Insights section when group has no library data', () => {
    render(
      <FrameDetailPanel
        frame={makeFrame()}
        group={makeGroup()}
        onBack={vi.fn()}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(screen.getByText('Insights')).toBeInTheDocument()
    expect(screen.getByText('No library matches found for this group.')).toBeInTheDocument()
  })
})
