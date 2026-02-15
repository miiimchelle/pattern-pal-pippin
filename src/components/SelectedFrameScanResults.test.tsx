import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SelectedFrameScanResults } from './SelectedFrameScanResults'
import type { SelectedFrameScanResult } from '../hooks/usePluginMessages'

function makeResult(overrides: Partial<SelectedFrameScanResult> = {}): SelectedFrameScanResult {
  return {
    selectedFrame: {
      id: 'f1',
      name: 'Screen A',
      width: 375,
      height: 812,
      childCount: 3,
      maxDepth: 4,
      componentIds: [],
      componentNames: [],
      aspectRatio: 0.46,
      layoutMode: 'VERTICAL',
      cornerRadius: 0,
      hasAutoLayout: true,
      fillCount: 1,
      childTypeDistribution: {},
    },
    teamFileResults: [],
    libraryMatches: [],
    overallConsistency: 80,
    ruleIssues: [],
    ...overrides,
  }
}

describe('SelectedFrameScanResults', () => {
  it('renders rule issue violation cards', () => {
    const result = makeResult({
      ruleIssues: [
        {
          ruleId: 'primary-button-limit',
          ruleName: 'Primary Button Limit',
          severity: 'error' as const,
          frameId: 'frame-1',
          frameName: 'Login Screen',
          nodeIds: ['btn-1', 'btn-2'],
          message:
            "Container 'Login Screen' has 2 Primary Buttons — only one is allowed per screen.",
        },
      ],
    })

    render(<SelectedFrameScanResults result={result} onOpenInFigma={() => {}} />)

    expect(screen.getByText('Rule violations')).toBeTruthy()
    expect(screen.getByText('Login Screen')).toBeTruthy()
    expect(screen.getByText('Primary Button Limit')).toBeTruthy()
    expect(screen.getByText(/has 2 Primary Buttons/)).toBeTruthy()
  })

  it('shows correct count badge', () => {
    const result = makeResult({
      ruleIssues: [
        {
          ruleId: 'primary-button-limit',
          ruleName: 'Primary Button Limit',
          severity: 'error' as const,
          frameId: 'f1',
          frameName: 'A',
          nodeIds: ['b1', 'b2'],
          message: 'msg1',
        },
        {
          ruleId: 'primary-button-limit',
          ruleName: 'Primary Button Limit',
          severity: 'error' as const,
          frameId: 'f2',
          frameName: 'B',
          nodeIds: ['b3', 'b4', 'b5'],
          message: 'msg2',
        },
      ],
    })

    const { container } = render(
      <SelectedFrameScanResults result={result} onOpenInFigma={() => {}} />
    )
    const countBadge = container.querySelector('.violations-header .status-count')
    expect(countBadge?.textContent).toBe('2')
  })

  it('calls onZoomToFrame when clicking a rule issue card', () => {
    const zoomFn = vi.fn()
    const result = makeResult({
      ruleIssues: [
        {
          ruleId: 'primary-button-limit',
          ruleName: 'Primary Button Limit',
          severity: 'error' as const,
          frameId: 'frame-42',
          frameName: 'Checkout',
          nodeIds: ['b1', 'b2'],
          message: 'msg',
        },
      ],
    })

    render(
      <SelectedFrameScanResults result={result} onOpenInFigma={() => {}} onZoomToFrame={zoomFn} />
    )

    fireEvent.click(screen.getByText('Checkout'))
    expect(zoomFn).toHaveBeenCalledWith('frame-42')
  })

  it('shows empty state when all arrays are empty', () => {
    const result = makeResult()
    render(<SelectedFrameScanResults result={result} onOpenInFigma={() => {}} />)

    expect(screen.getByText('No violations found')).toBeTruthy()
  })

  it('hides empty state when rule issues exist', () => {
    const result = makeResult({
      ruleIssues: [
        {
          ruleId: 'primary-button-limit',
          ruleName: 'Primary Button Limit',
          severity: 'error' as const,
          frameId: 'f1',
          frameName: 'X',
          nodeIds: ['b1', 'b2'],
          message: 'msg',
        },
      ],
    })

    render(<SelectedFrameScanResults result={result} onOpenInFigma={() => {}} />)

    expect(screen.queryByText('No violations found')).toBeNull()
  })
})
