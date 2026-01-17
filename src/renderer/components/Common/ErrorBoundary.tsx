/**
 * ErrorBoundary Component
 * 
 * React error boundary that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI.
 * 
 * Validates: Requirements 8.1, 8.2, 8.5
 * - 8.1: Log error details when command execution fails
 * - 8.2: Display user-friendly error message
 * - 8.5: Continue operating normally even if individual components fail
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Result, Button, Typography, Space, Card } from 'antd'
import { ReloadOutlined, BugOutlined, CopyOutlined } from '@ant-design/icons'
import { withTranslation, WithTranslation } from 'react-i18next'

const { Text, Paragraph } = Typography

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps extends WithTranslation {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showErrorDetails: boolean
}

// ============================================================================
// Error Logging Utility
// ============================================================================

/**
 * Log error details with timestamp
 * Validates: Requirement 8.1
 */
export function logError(error: Error, context: string, additionalInfo?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString()
  const errorLog = {
    timestamp,
    context,
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...additionalInfo,
  }
  
  console.error('[Error Log]', errorLog)
  
  // In production, you might want to send this to an error tracking service
  if (typeof window !== 'undefined' && (window as { __DEV__?: boolean }).__DEV__) {
    console.group(`🔴 Error in ${context}`)
    console.error('Error:', error)
    console.error('Timestamp:', timestamp)
    if (additionalInfo) {
      console.error('Additional Info:', additionalInfo)
    }
    console.groupEnd()
  }
}

// ============================================================================
// ErrorBoundary Component
// ============================================================================

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error - Validates: Requirement 8.1
    logError(error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
    })

    this.setState({ errorInfo })

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReload = (): void => {
    window.location.reload()
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
    })
  }

  toggleErrorDetails = (): void => {
    this.setState(prev => ({ showErrorDetails: !prev.showErrorDetails }))
  }

  copyErrorDetails = (): void => {
    const { error, errorInfo } = this.state
    const errorDetails = `
Error: ${error?.name || 'Unknown'}
Message: ${error?.message || 'No message'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
Timestamp: ${new Date().toISOString()}
    `.trim()

    navigator.clipboard.writeText(errorDetails).catch(console.error)
  }

  render(): ReactNode {
    const { hasError, error, errorInfo, showErrorDetails } = this.state
    const { children, fallback, t, showDetails = true } = this.props

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback
      }

      // Default error UI - Validates: Requirement 8.2
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full shadow-lg">
            <Result
              status="error"
              title={t('errors.unknown')}
              subTitle={t('errors.tryAgain')}
              extra={
                <Space direction="vertical" size="middle" className="w-full">
                  <Space>
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      onClick={this.handleRetry}
                    >
                      {t('common.retry')}
                    </Button>
                    <Button onClick={this.handleReload}>
                      {t('common.refresh')}
                    </Button>
                  </Space>

                  {showDetails && (
                    <Button
                      type="link"
                      icon={<BugOutlined />}
                      onClick={this.toggleErrorDetails}
                    >
                      {showErrorDetails ? t('tooltips.collapse') : t('common.details')}
                    </Button>
                  )}

                  {showErrorDetails && error && (
                    <Card
                      size="small"
                      className="text-left"
                      extra={
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={this.copyErrorDetails}
                        >
                          {t('common.copy')}
                        </Button>
                      }
                    >
                      <Space direction="vertical" size="small" className="w-full">
                        <div>
                          <Text strong>Error: </Text>
                          <Text type="danger">{error.name}</Text>
                        </div>
                        <div>
                          <Text strong>Message: </Text>
                          <Text>{error.message}</Text>
                        </div>
                        {error.stack && (
                          <div>
                            <Text strong>Stack Trace:</Text>
                            <Paragraph
                              code
                              className="mt-2 text-xs max-h-40 overflow-auto"
                            >
                              {error.stack}
                            </Paragraph>
                          </div>
                        )}
                        {errorInfo?.componentStack && (
                          <div>
                            <Text strong>Component Stack:</Text>
                            <Paragraph
                              code
                              className="mt-2 text-xs max-h-40 overflow-auto"
                            >
                              {errorInfo.componentStack}
                            </Paragraph>
                          </div>
                        )}
                      </Space>
                    </Card>
                  )}
                </Space>
              }
            />
          </Card>
        </div>
      )
    }

    return children
  }
}

// Export with translation HOC
export const ErrorBoundary = withTranslation()(ErrorBoundaryClass)

// ============================================================================
// Functional Error Display Component
// ============================================================================

interface ErrorDisplayProps {
  error: Error | string | null
  title?: string
  onRetry?: () => void
  showDetails?: boolean
}

/**
 * ErrorDisplay Component
 * 
 * A functional component for displaying errors inline.
 * Validates: Requirement 8.2
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title,
  onRetry,
  showDetails = false,
}) => {
  const errorMessage = error instanceof Error ? error.message : error

  if (!error) return null

  return (
    <Result
      status="error"
      title={title || 'Error'}
      subTitle={errorMessage}
      extra={
        onRetry && (
          <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {showDetails && error instanceof Error && error.stack && (
        <Card size="small" className="mt-4">
          <Paragraph code className="text-xs max-h-40 overflow-auto m-0">
            {error.stack}
          </Paragraph>
        </Card>
      )}
    </Result>
  )
}

export default ErrorBoundary
