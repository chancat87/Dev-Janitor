/**
 * EmptyState Component
 * 
 * Displays empty state UI when no data is available.
 * Provides contextual messages and actions for different scenarios.
 * 
 * Validates: Requirements 5.1, 5.5
 * - 5.1: Clean and intuitive layout
 * - 5.5: Provide visual feedback for user interactions
 */

import React from 'react'
import { Empty, Button, Typography, Space } from 'antd'
import {
  ReloadOutlined,
  ToolOutlined,
  AppstoreOutlined,
  CloudServerOutlined,
  SettingOutlined,
  InboxOutlined,
  SearchOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Text, Title } = Typography

// ============================================================================
// Types
// ============================================================================

type EmptyVariant = 'tools' | 'packages' | 'services' | 'environment' | 'search' | 'default'

interface EmptyStateProps {
  variant?: EmptyVariant
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  onRefresh?: () => void
  onAction?: () => void
  actionText?: string
  className?: string
  size?: 'small' | 'default' | 'large'
}

// ============================================================================
// Icon Mapping
// ============================================================================

const variantIcons: Record<EmptyVariant, React.ReactNode> = {
  tools: <ToolOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
  packages: <AppstoreOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
  services: <CloudServerOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
  environment: <SettingOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
  search: <SearchOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
  default: <InboxOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
}

// ============================================================================
// EmptyState Component
// ============================================================================

/**
 * EmptyState Component
 * 
 * Renders contextual empty state UI based on variant.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'default',
  title,
  description,
  icon,
  action,
  onRefresh,
  onAction,
  actionText,
  className = '',
  size = 'default',
}) => {
  const { t } = useTranslation()

  // Get default title and description based on variant
  const getDefaultContent = () => {
    switch (variant) {
      case 'tools':
        return {
          title: t('empty.tools'),
          description: t('empty.toolsDescription'),
        }
      case 'packages':
        return {
          title: t('empty.packages'),
          description: t('empty.packagesDescription'),
        }
      case 'services':
        return {
          title: t('empty.services'),
          description: t('empty.servicesDescription'),
        }
      case 'environment':
        return {
          title: t('empty.environment'),
          description: t('empty.environmentDescription'),
        }
      case 'search':
        return {
          title: t('common.noData'),
          description: t('common.searchPlaceholder'),
        }
      default:
        return {
          title: t('common.noData'),
          description: '',
        }
    }
  }

  const defaultContent = getDefaultContent()
  const displayTitle = title || defaultContent.title
  const displayDescription = description || defaultContent.description
  const displayIcon = icon || variantIcons[variant]

  // Size-based styling
  const sizeStyles = {
    small: { padding: '24px', iconSize: 32 },
    default: { padding: '48px', iconSize: 48 },
    large: { padding: '64px', iconSize: 64 },
  }

  const currentSize = sizeStyles[size]

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${className}`}
      style={{ padding: currentSize.padding }}
    >
      <Empty
        image={displayIcon}
        imageStyle={{ height: currentSize.iconSize }}
        description={
          <Space direction="vertical" size="small">
            <Title level={size === 'small' ? 5 : 4} className="!mb-0">
              {displayTitle}
            </Title>
            {displayDescription && (
              <Text type="secondary">{displayDescription}</Text>
            )}
          </Space>
        }
      >
        <Space className="mt-4">
          {onRefresh && (
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              {t('common.refresh')}
            </Button>
          )}
          {action}
          {onAction && actionText && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onAction}>
              {actionText}
            </Button>
          )}
        </Space>
      </Empty>
    </div>
  )
}

// ============================================================================
// Specialized Empty State Components
// ============================================================================

/**
 * ToolsEmpty - Empty state for tools view
 */
export const ToolsEmpty: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyState variant="tools" onRefresh={onRefresh} />
)

/**
 * PackagesEmpty - Empty state for packages view
 */
export const PackagesEmpty: React.FC<{ manager?: string; onRefresh?: () => void }> = ({
  manager,
  onRefresh,
}) => {
  const { t } = useTranslation()
  
  return (
    <EmptyState
      variant="packages"
      title={manager ? t('packages.noPackages') : undefined}
      description={manager ? t('packages.managerNotInstalled', { manager }) : undefined}
      onRefresh={onRefresh}
    />
  )
}

/**
 * ServicesEmpty - Empty state for services view
 */
export const ServicesEmpty: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyState variant="services" onRefresh={onRefresh} />
)

/**
 * EnvironmentEmpty - Empty state for environment view
 */
export const EnvironmentEmpty: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyState variant="environment" onRefresh={onRefresh} />
)

/**
 * SearchEmpty - Empty state for search results
 */
export const SearchEmpty: React.FC<{ searchTerm?: string }> = ({ searchTerm }) => {
  const { t } = useTranslation()
  
  return (
    <EmptyState
      variant="search"
      title={t('common.noData')}
      description={searchTerm ? `No results found for "${searchTerm}"` : undefined}
      size="small"
    />
  )
}

// ============================================================================
// Empty State with Error
// ============================================================================

interface EmptyWithErrorProps {
  error?: string | null
  onRetry?: () => void
  variant?: EmptyVariant
}

/**
 * EmptyWithError - Empty state that can also display errors
 */
export const EmptyWithError: React.FC<EmptyWithErrorProps> = ({
  error,
  onRetry,
  variant = 'default',
}) => {
  const { t } = useTranslation()

  if (error) {
    return (
      <EmptyState
        variant={variant}
        title={t('common.error')}
        description={error}
        icon={<InboxOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />}
        onRefresh={onRetry}
      />
    )
  }

  return <EmptyState variant={variant} onRefresh={onRetry} />
}

export default EmptyState
