import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Pattern Pal error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="h-screen bg-white flex flex-col items-center justify-center p-8 text-center pattern-pal-body"
          role="alert"
        >
          <div className="text-4xl mb-4" aria-hidden="true">
            &#9888;&#65039;
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500">Close and reopen the plugin to try again.</p>
        </div>
      )
    }

    return this.props.children
  }
}
