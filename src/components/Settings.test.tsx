import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Settings } from './Settings'

describe('Settings', () => {
  const defaults = {
    token: '',
    libraryUrls: [],
    teamId: '',
    onSave: vi.fn(),
    onBack: vi.fn(),
  }

  it('renders all form fields', () => {
    render(<Settings {...defaults} />)
    expect(screen.getByText('Figma Personal Access Token')).toBeInTheDocument()
    expect(screen.getByText('Figma Team ID')).toBeInTheDocument()
    expect(screen.getByText(/Library File URLs/)).toBeInTheDocument()
  })

  it('pre-fills values from props', () => {
    render(
      <Settings
        token="figd_abc"
        libraryUrls={['https://figma.com/file/a', 'https://figma.com/file/b']}
        teamId="12345"
        onSave={vi.fn()}
        onBack={vi.fn()}
      />
    )
    expect(screen.getByPlaceholderText('figd_...')).toHaveValue('figd_abc')
    expect(screen.getByPlaceholderText('123456789')).toHaveValue('12345')
    expect(screen.getByPlaceholderText(/Design-System/)).toHaveValue(
      'https://figma.com/file/a\nhttps://figma.com/file/b'
    )
  })

  it('disables Save when token is empty', () => {
    render(<Settings {...defaults} teamId="123" />)
    expect(screen.getByText('Save Settings')).toBeDisabled()
  })

  it('disables Save when teamId is empty', () => {
    render(<Settings {...defaults} token="figd_x" />)
    expect(screen.getByText('Save Settings')).toBeDisabled()
  })

  it('enables Save when both token and teamId are present', () => {
    render(<Settings {...defaults} token="figd_x" teamId="123" />)
    expect(screen.getByText('Save Settings')).toBeEnabled()
  })

  it('calls onSave with parsed values when Save clicked', async () => {
    const onSave = vi.fn()
    render(
      <Settings
        token="figd_abc"
        libraryUrls={['https://figma.com/file/a']}
        teamId="999"
        onSave={onSave}
        onBack={vi.fn()}
      />
    )
    await userEvent.click(screen.getByText('Save Settings'))
    expect(onSave).toHaveBeenCalledWith('figd_abc', ['https://figma.com/file/a'], '999')
  })

  it('filters empty lines from library URLs', async () => {
    const onSave = vi.fn()
    render(<Settings token="t" libraryUrls={[]} teamId="1" onSave={onSave} onBack={vi.fn()} />)
    const textarea = screen.getByPlaceholderText(/Design-System/)
    await userEvent.type(textarea, 'url1\n\nurl2\n  \nurl3')
    await userEvent.click(screen.getByText('Save Settings'))
    expect(onSave).toHaveBeenCalledWith('t', ['url1', 'url2', 'url3'], '1')
  })

  it('calls onBack when Cancel clicked', async () => {
    const onBack = vi.fn()
    render(<Settings {...defaults} onBack={onBack} />)
    await userEvent.click(screen.getByText('Cancel'))
    expect(onBack).toHaveBeenCalled()
  })

  it('applies error class when token is empty', () => {
    render(<Settings {...defaults} />)
    expect(screen.getByPlaceholderText('figd_...')).toHaveClass('pattern-pal-input-error')
  })

  it('applies error class when teamId is empty', () => {
    render(<Settings {...defaults} />)
    expect(screen.getByPlaceholderText('123456789')).toHaveClass('pattern-pal-input-error')
  })

  it('renders Test Connection button when onTestConnection provided', () => {
    render(<Settings {...defaults} onTestConnection={vi.fn()} />)
    expect(screen.getByText('Test Connection')).toBeInTheDocument()
  })

  it('does not render Test Connection button without onTestConnection', () => {
    render(<Settings {...defaults} />)
    expect(screen.queryByText('Test Connection')).toBeNull()
  })

  it('disables Test Connection when token is empty', () => {
    render(<Settings {...defaults} onTestConnection={vi.fn()} />)
    expect(screen.getByText('Test Connection')).toBeDisabled()
  })

  it('calls onTestConnection with token and teamId', async () => {
    const onTest = vi.fn()
    render(<Settings {...defaults} token="figd_x" teamId="42" onTestConnection={onTest} />)
    await userEvent.click(screen.getByText('Test Connection'))
    expect(onTest).toHaveBeenCalledWith('figd_x', '42')
  })

  it('shows Testing... when isTestingConnection is true', () => {
    render(
      <Settings {...defaults} token="t" onTestConnection={vi.fn()} isTestingConnection={true} />
    )
    expect(screen.getByText('Testing...')).toBeInTheDocument()
  })

  it('shows token valid message on success', () => {
    render(
      <Settings
        {...defaults}
        token="t"
        onTestConnection={vi.fn()}
        connectionTest={{ tokenValid: true, teamIdValid: true, userName: 'alice', error: '' }}
      />
    )
    expect(screen.getByText(/Token valid.*alice/)).toBeInTheDocument()
  })

  it('shows invalid token message on failure', () => {
    render(
      <Settings
        {...defaults}
        token="t"
        onTestConnection={vi.fn()}
        connectionTest={{ tokenValid: false, teamIdValid: false, userName: '', error: '' }}
      />
    )
    expect(screen.getByText(/Invalid token/)).toBeInTheDocument()
  })

  it('shows team ID valid message', () => {
    render(
      <Settings
        {...defaults}
        token="t"
        teamId="1"
        onTestConnection={vi.fn()}
        connectionTest={{ tokenValid: true, teamIdValid: true, userName: '', error: '' }}
      />
    )
    expect(screen.getByText(/Team ID valid/)).toBeInTheDocument()
  })

  it('shows invalid Team ID message', () => {
    render(
      <Settings
        {...defaults}
        token="t"
        teamId="1"
        onTestConnection={vi.fn()}
        connectionTest={{ tokenValid: true, teamIdValid: false, userName: '', error: '' }}
      />
    )
    expect(screen.getByText(/Invalid Team ID/)).toBeInTheDocument()
  })

  it('shows connection error message', () => {
    render(
      <Settings
        {...defaults}
        token="t"
        onTestConnection={vi.fn()}
        connectionTest={{
          tokenValid: false,
          teamIdValid: false,
          userName: '',
          error: 'Network error',
        }}
      />
    )
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })
})
