import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failed', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="mx-auto max-w-2xl p-8" role="alert">
          <h1 className="text-2xl font-bold">Unable to display this page</h1>
          <p>{this.state.error.message}</p>
          <a className="text-accent underline" href="/projects">Return to projects</a>
        </main>
      )
    }
    return this.props.children
  }
}
