import * as React from 'react'
import { Button, Card, Separator } from '@/components/heroui-compat'
import { Icon } from '@/components/Icon'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Global error boundary component that catches JavaScript errors anywhere in its child tree.
 * Displays a user-friendly error UI using HeroUI components.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo } = this.state
      const isDev = import.meta.env.DEV

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-xl w-full">
            <Card.Header className="flex gap-3 pb-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-danger/10">
                  <Icon
                    name="WarningTriangle"
                    className="w-6 h-6 text-danger"
                  />
                </div>
                <div className="flex flex-col">
                  <p className="text-lg font-semibold">Something went wrong</p>
                  <p className="text-small text-default-500">
                    An unexpected error occurred
                  </p>
                </div>
              </div>
            </Card.Header>
            <Card.Content className="gap-4">
              {error && (
                <div className="space-y-2">
                  <p className="text-sm text-default-600">
                    {error.message || 'An unknown error occurred'}
                  </p>
                  {isDev && errorInfo && (
                    <>
                      <Separator />
                      <details className="text-xs">
                        <summary className="cursor-pointer text-default-500 hover:text-default-700 mb-2">
                          Show technical details
                        </summary>
                        <code className="w-full overflow-auto max-h-48 p-2 text-xs whitespace-pre-wrap">
                          {error.stack}
                        </code>
                        <p className="mt-2 text-default-500">
                          Component stack:
                        </p>
                        <code className="w-full overflow-auto max-h-32 p-2 text-xs whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </code>
                      </details>
                    </>
                  )}
                </div>
              )}

              <Separator />

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  color="primary"
                  variant="primary"
                  onPress={this.handleReload}
                  startContent={<Icon name="Refresh" className="w-4 h-4" />}
                  className="flex-1"
                >
                  Reload page
                </Button>
                <Button
                  color="default"
                  variant="secondary"
                  onPress={this.handleReset}
                  startContent={<Icon name="Undo" className="w-4 h-4" />}
                  className="flex-1"
                >
                  Try again
                </Button>
              </div>

              <p className="text-xs text-default-400 text-center">
                If the problem persists, try clearing your browser data or
                contact support.
              </p>
            </Card.Content>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
