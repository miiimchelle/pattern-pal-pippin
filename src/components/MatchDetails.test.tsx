import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MatchDetails } from './MatchDetails'

describe('MatchDetails', () => {
  it('returns null when all arrays empty', () => {
    const { container } = render(
      <MatchDetails
        componentUsage={[]}
        nameMatches={[]}
        libraryMatches={[]}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders structural library matches', () => {
    render(
      <MatchDetails
        componentUsage={[]}
        nameMatches={[]}
        libraryMatches={[
          { componentId: 'c1', componentName: 'Card', similarity: 82, fileKey: 'fk1', fileUrl: '' },
        ]}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(screen.getByText('Structurally similar to:')).toBeInTheDocument()
    expect(screen.getByText('Card')).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument()
  })

  it('renders component usage section', () => {
    render(
      <MatchDetails
        componentUsage={[
          {
            id: 'c1',
            name: 'Button',
            description: 'Primary button',
            fileKey: 'fk1',
            fileName: 'Lib',
            fileUrl: '',
          },
        ]}
        nameMatches={[]}
        libraryMatches={[]}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(screen.getByText(/Uses 1 library component/)).toBeInTheDocument()
    expect(screen.getByText('Button')).toBeInTheDocument()
  })

  it('pluralizes component count', () => {
    render(
      <MatchDetails
        componentUsage={[
          {
            id: 'c1',
            name: 'Button',
            description: '',
            fileKey: 'fk1',
            fileName: 'Lib',
            fileUrl: '',
          },
          {
            id: 'c2',
            name: 'Input',
            description: '',
            fileKey: 'fk1',
            fileName: 'Lib',
            fileUrl: '',
          },
        ]}
        nameMatches={[]}
        libraryMatches={[]}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(screen.getByText(/Uses 2 library components/)).toBeInTheDocument()
  })

  it('renders fuzzy name matches', () => {
    render(
      <MatchDetails
        componentUsage={[]}
        nameMatches={[
          {
            id: 'n1',
            name: 'Dialog',
            description: 'A modal dialog component',
            fileKey: 'fk1',
            fileName: 'Lib',
            fileUrl: '',
          },
        ]}
        libraryMatches={[]}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(screen.getByText(/Similar to documented pattern/)).toBeInTheDocument()
    expect(screen.getByText('Dialog')).toBeInTheDocument()
  })

  it('truncates long descriptions', () => {
    const longDesc = 'A'.repeat(60)
    render(
      <MatchDetails
        componentUsage={[]}
        nameMatches={[
          {
            id: 'n1',
            name: 'Thing',
            description: longDesc,
            fileKey: 'fk1',
            fileName: 'Lib',
            fileUrl: '',
          },
        ]}
        libraryMatches={[]}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument()
  })

  it('calls onOpenInFigma with correct URL for library match', () => {
    const onOpen = vi.fn()
    render(
      <MatchDetails
        componentUsage={[]}
        nameMatches={[]}
        libraryMatches={[
          {
            componentId: '1:23',
            componentName: 'Card',
            similarity: 75,
            fileKey: 'fk1',
            fileUrl: '',
          },
        ]}
        onOpenInFigma={onOpen}
      />
    )
    fireEvent.click(screen.getByText('Card'))
    expect(onOpen).toHaveBeenCalledWith('https://www.figma.com/design/fk1?node-id=1-23')
  })

  it('calls onOpenInFigma for component usage button', () => {
    const onOpen = vi.fn()
    render(
      <MatchDetails
        componentUsage={[
          {
            id: '2:34',
            name: 'Button',
            description: '',
            fileKey: 'fk2',
            fileName: 'Lib',
            fileUrl: '',
          },
        ]}
        nameMatches={[]}
        libraryMatches={[]}
        onOpenInFigma={onOpen}
      />
    )
    fireEvent.click(screen.getByText('Button'))
    expect(onOpen).toHaveBeenCalledWith('https://www.figma.com/design/fk2?node-id=2-34')
  })

  it('applies green color for high similarity', () => {
    const { container } = render(
      <MatchDetails
        componentUsage={[]}
        nameMatches={[]}
        libraryMatches={[
          { componentId: 'c1', componentName: 'Card', similarity: 85, fileKey: 'fk1', fileUrl: '' },
        ]}
        onOpenInFigma={vi.fn()}
      />
    )
    expect(container.querySelector('.text-green-700')).toBeTruthy()
  })
})
