/**
 * LoadingState Component
 * 
 * Provides loading state UI with skeleton placeholders.
 * Supports various loading patterns for different content types.
 * 
 * Validates: Requirements 5.5, 7.4
 * - 5.5: Provide visual feedback for user interactions
 * - 7.4: Display loading indicator during scanning
 */

import React from 'react'
import { Skeleton, Spin, Card, Space, Row, Col, theme } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

// ============================================================================
// Types
// ============================================================================

type LoadingVariant = 'card' | 'table' | 'list' | 'detail' | 'inline' | 'fullscreen'

interface LoadingStateProps {
  loading: boolean
  children?: React.ReactNode
  variant?: LoadingVariant
  rows?: number
  columns?: number
  tip?: string
  size?: 'small' | 'default' | 'large'
  className?: string
}

// ============================================================================
// Loading Spinner
// ============================================================================

const loadingIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />

// ============================================================================
// Skeleton Components
// ============================================================================

/**
 * Card Skeleton - for tool cards and similar card layouts
 */
const CardSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <Row gutter={[16, 16]}>
    {Array.from({ length: count }).map((_, index) => (
      <Col key={index} xs={24} sm={12} lg={8} xl={6}>
        <Card className="h-full">
          <Skeleton active avatar paragraph={{ rows: 2 }} />
        </Card>
      </Col>
    ))}
  </Row>
)

/**
 * Table Skeleton - for data tables
 */
const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-3">
    {/* Table header */}
    <div className="flex gap-4 pb-2 border-b">
      <Skeleton.Input active size="small" style={{ width: 100 }} />
      <Skeleton.Input active size="small" style={{ width: 150 }} />
      <Skeleton.Input active size="small" style={{ width: 200 }} />
      <Skeleton.Input active size="small" style={{ width: 80 }} />
    </div>
    {/* Table rows */}
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex gap-4 py-2">
        <Skeleton.Input active size="small" style={{ width: 100 }} />
        <Skeleton.Input active size="small" style={{ width: 150 }} />
        <Skeleton.Input active size="small" style={{ width: 200 }} />
        <Skeleton.Button active size="small" style={{ width: 80 }} />
      </div>
    ))}
  </div>
)

/**
 * List Skeleton - for list items
 */
const ListSkeleton: React.FC<{ rows?: number; itemStyle?: React.CSSProperties }> = ({
  rows = 5,
  itemStyle,
}) => (
  <div className="space-y-4">
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="flex items-center gap-4 p-4 rounded-lg shadow-sm"
        style={itemStyle}
      >
        <Skeleton.Avatar active size="large" />
        <div className="flex-1">
          <Skeleton active paragraph={{ rows: 1 }} />
        </div>
      </div>
    ))}
  </div>
)

/**
 * Detail Skeleton - for detail views
 */
const DetailSkeleton: React.FC = () => (
  <Card>
    <Space direction="vertical" size="large" className="w-full">
      <div className="flex items-center gap-4">
        <Skeleton.Avatar active size={64} />
        <div className="flex-1">
          <Skeleton.Input active size="large" style={{ width: 200 }} />
          <div className="mt-2">
            <Skeleton.Input active size="small" style={{ width: 150 }} />
          </div>
        </div>
      </div>
      <Skeleton active paragraph={{ rows: 4 }} />
      <div className="flex gap-2">
        <Skeleton.Button active />
        <Skeleton.Button active />
      </div>
    </Space>
  </Card>
)

/**
 * Inline Skeleton - for inline loading states
 */
const InlineSkeleton: React.FC = () => (
  <Space>
    <Spin indicator={loadingIcon} size="small" />
    <Skeleton.Input active size="small" style={{ width: 100 }} />
  </Space>
)

/**
 * Fullscreen Loading - for full page loading states
 */
const FullscreenLoading: React.FC<{ tip?: string }> = ({ tip }) => {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: token.colorBgMask }}
    >
      <div className="text-center">
        <Spin indicator={loadingIcon} size="large" />
        <div className="mt-4" style={{ color: token.colorTextSecondary }}>
          {tip || t('loading.general')}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main LoadingState Component
// ============================================================================

/**
 * LoadingState Component
 * 
 * Renders appropriate loading skeleton based on variant.
 * When not loading, renders children.
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  loading,
  children,
  variant = 'card',
  rows = 5,
  columns = 6,
  tip,
  size = 'default',
  className = '',
}) => {
  const { t } = useTranslation()
  const { token } = theme.useToken()

  if (!loading) {
    return <>{children}</>
  }

  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return <CardSkeleton count={columns} />
      case 'table':
        return <TableSkeleton rows={rows} />
      case 'list':
        return <ListSkeleton rows={rows} itemStyle={{ background: token.colorBgContainer }} />
      case 'detail':
        return <DetailSkeleton />
      case 'inline':
        return <InlineSkeleton />
      case 'fullscreen':
        return <FullscreenLoading tip={tip || t('loading.general')} />
      default:
        return <Skeleton active paragraph={{ rows }} />
    }
  }

  if (variant === 'fullscreen') {
    return renderSkeleton()
  }

  return (
    <div className={`loading-state ${className}`}>
      {tip && (
        <div className="text-center mb-4" style={{ color: token.colorTextSecondary }}>
          <Spin indicator={loadingIcon} size={size} />
          <span className="ml-2">{tip}</span>
        </div>
      )}
      {renderSkeleton()}
    </div>
  )
}

// ============================================================================
// Specialized Loading Components
// ============================================================================

/**
 * ToolsLoading - Loading state for tools view
 */
export const ToolsLoading: React.FC = () => {
  const { t } = useTranslation()
  return <LoadingState loading variant="card" columns={6} tip={t('loading.tools')} />
}

/**
 * PackagesLoading - Loading state for packages view
 */
export const PackagesLoading: React.FC = () => {
  const { t } = useTranslation()
  return <LoadingState loading variant="table" rows={8} tip={t('loading.packages')} />
}

/**
 * ServicesLoading - Loading state for services view
 */
export const ServicesLoading: React.FC = () => {
  const { t } = useTranslation()
  return <LoadingState loading variant="table" rows={5} tip={t('loading.services')} />
}

/**
 * EnvironmentLoading - Loading state for environment view
 */
export const EnvironmentLoading: React.FC = () => {
  const { t } = useTranslation()
  return <LoadingState loading variant="table" rows={10} tip={t('loading.environment')} />
}

// ============================================================================
// Loading Wrapper HOC
// ============================================================================

interface WithLoadingProps {
  loading: boolean
  loadingVariant?: LoadingVariant
  loadingTip?: string
}

/**
 * Higher-order component that wraps a component with loading state
 */
export function withLoading<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P & WithLoadingProps> {
  return function WithLoadingComponent({
    loading,
    loadingVariant = 'card',
    loadingTip,
    ...props
  }: P & WithLoadingProps) {
    return (
      <LoadingState loading={loading} variant={loadingVariant} tip={loadingTip}>
        <WrappedComponent {...(props as P)} />
      </LoadingState>
    )
  }
}

export default LoadingState
