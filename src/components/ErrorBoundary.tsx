import * as React from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Code,
} from '@heroui/react'
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

  handleClearDataAndReload = async () => {
    try {
      // Clear IndexedDB
      const databases = await indexedDB.databases()
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name)
        }
      }
      // Clear localStorage
      localStorage.clear()
      // Clear sessionStorage
      sessionStorage.clear()
      // Reload
      window.location.reload()
    } catch (e) {
      console.error('Failed to clear data:', e)
      window.location.reload()
    }
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
            <CardHeader className="flex gap-3 pb-0">
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
            </CardHeader>
            <CardBody className="gap-4">
              {error && (
                <div className="space-y-2">
                  <p className="text-sm text-default-600">
                    {error.message || 'An unknown error occurred'}
                  </p>
                  {isDev && errorInfo && (
                    <>
                      <Divider />
                      <details className="text-xs">
                        <summary className="cursor-pointer text-default-500 hover:text-default-700 mb-2">
                          Show technical details
                        </summary>
                        <Code className="w-full overflow-auto max-h-48 p-2 text-xs whitespace-pre-wrap">
                          {error.stack}
                        </Code>
                        <p className="mt-2 text-default-500">
                          Component stack:
                        </p>
                        <Code className="w-full overflow-auto max-h-32 p-2 text-xs whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </Code>
                      </details>
                    </>
                  )}
                </div>
              )}

              <Divider />

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  color="primary"
                  variant="solid"
                  onPress={this.handleReload}
                  startContent={<Icon name="Refresh" className="w-4 h-4" />}
                  className="flex-1"
                >
                  Reload page
                </Button>
                <Button
                  color="default"
                  variant="flat"
                  onPress={this.handleReset}
                  startContent={<Icon name="Undo" className="w-4 h-4" />}
                  className="flex-1"
                >
                  Try again
                </Button>
              </div>

              <Button
                color="danger"
                variant="light"
                size="sm"
                onPress={this.handleClearDataAndReload}
                startContent={<Icon name="Trash" className="w-4 h-4" />}
                className="w-full"
              >
                Clear all data and reload
              </Button>

              <p className="text-xs text-default-400 text-center">
                If the problem persists, try clearing your browser data or
                contact support.
              </p>
            </CardBody>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
