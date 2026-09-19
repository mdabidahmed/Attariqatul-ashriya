import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Last line of defence: shows a recoverable message instead of a blank page. */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled error in the practice app', error, info.componentStack)
  }

  private readonly handleReload = (): void => {
    window.location.reload()
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <main className="app app--centred">
        <div className="panel panel--error">
          <h1 className="panel__title">Something went wrong</h1>
          <p className="text-soft">
            The app hit an unexpected error and stopped. Your saved progress is untouched.
          </p>
          <pre className="error-detail">{error.message}</pre>
          <button type="button" className="button button--primary" onClick={this.handleReload}>
            Reload the app
          </button>
        </div>
      </main>
    )
  }
}
