import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RulesPanel } from './RulesPanel'
import type { RuleConfig } from '../hooks/usePluginMessages'

const defaultRules: RuleConfig[] = [
  {
    id: 'primary-button-limit',
    name: 'Primary Button Limit',
    description: 'Max one primary button per screen',
    enabled: true,
  },
  {
    id: 'text-style-consistency',
    name: 'Text Style Consistency',
    description: 'Text nodes should use text styles',
    enabled: true,
  },
  {
    id: 'spacing-consistency',
    name: 'Spacing Consistency',
    description: 'Auto-layout spacing values should be consistent',
    enabled: false,
  },
  {
    id: 'color-token-usage',
    name: 'Color Token Usage',
    description: 'Solid fills should reference a style',
    enabled: true,
  },
  {
    id: 'contrast-ratio',
    name: 'Contrast Ratio (WCAG AA)',
    description: 'Text must meet WCAG AA contrast',
    enabled: true,
  },
]

describe('RulesPanel', () => {
  it('renders all rule names', () => {
    render(<RulesPanel rules={defaultRules} onSave={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('Primary Button Limit')).toBeInTheDocument()
    expect(screen.getByText('Text Style Consistency')).toBeInTheDocument()
    expect(screen.getByText('Spacing Consistency')).toBeInTheDocument()
    expect(screen.getByText('Color Token Usage')).toBeInTheDocument()
    expect(screen.getByText('Contrast Ratio (WCAG AA)')).toBeInTheDocument()
  })

  it('renders rule descriptions', () => {
    render(<RulesPanel rules={defaultRules} onSave={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('Max one primary button per screen')).toBeInTheDocument()
    expect(screen.getByText('Text must meet WCAG AA contrast')).toBeInTheDocument()
  })

  it('renders checkboxes with correct checked state', () => {
    render(<RulesPanel rules={defaultRules} onSave={vi.fn()} onBack={vi.fn()} />)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(5)
    expect(checkboxes[0]).toBeChecked() // primary-button-limit
    expect(checkboxes[2]).not.toBeChecked() // spacing-consistency
  })

  it('calls onSave with toggled rule when checkbox clicked', () => {
    const onSave = vi.fn()
    render(<RulesPanel rules={defaultRules} onSave={onSave} onBack={vi.fn()} />)
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // toggle primary-button-limit off
    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'primary-button-limit', enabled: false }),
      ])
    )
  })

  it('calls onBack when Done button clicked', () => {
    const onBack = vi.fn()
    render(<RulesPanel rules={defaultRules} onSave={vi.fn()} onBack={onBack} />)
    fireEvent.click(screen.getByText('Done'))
    expect(onBack).toHaveBeenCalled()
  })

  it('renders header text', () => {
    render(<RulesPanel rules={defaultRules} onSave={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('Design Rules')).toBeInTheDocument()
  })

  it('renders empty state when no rules', () => {
    render(<RulesPanel rules={[]} onSave={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('Design Rules')).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
})
