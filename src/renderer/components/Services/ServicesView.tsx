/**
 * ServicesView Component
 * 
 * Main view for displaying running services:
 * - Service table with process info
 * - Auto-refresh toggle (every 5 seconds)
 * - Stop/kill functionality
 * 
 * Validates: Requirements 11.1, 11.3, 11.4, 11.5, 11.6, 11.7
 * Property 19: Running Service Information
 * Property 20: Service Stop Action Availability
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Typography, Switch, Space, Alert, Empty, Button, message, Badge, theme } from 'antd'
import { SyncOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import ServiceTable from './ServiceTable'

const { Title, Text } = Typography

// Auto-refresh interval in milliseconds (5 seconds) - Validates: Requirement 11.6
const AUTO_REFRESH_INTERVAL = 5000

const ServicesView: React.FC = () => {
  const { t } = useTranslation()
  const { token } = theme.useToken()
  const {
    runningServices,
    servicesLoading,
    servicesError,
    loadServices,
    killService,
  } = useAppStore()

  const [autoRefresh, setAutoRefresh] = useState(true)

  // Load services on mount
  useEffect(() => {
    if (runningServices.length === 0 && !servicesLoading) {
      loadServices()
    }
  }, [runningServices.length, servicesLoading, loadServices])

  // Auto-refresh effect - Validates: Requirement 11.6
  useEffect(() => {
    if (!autoRefresh) return

    const intervalId = setInterval(() => {
      loadServices()
    }, AUTO_REFRESH_INTERVAL)

    return () => clearInterval(intervalId)
  }, [autoRefresh, loadServices])

  // Handle kill service - Validates: Requirement 11.7
  const handleKillService = useCallback(async (pid: number) => {
    const success = await killService(pid)
    if (success) {
      message.success(t('services.stopSuccess'))
    } else {
      message.error(t('services.stopFailed'))
    }
  }, [killService, t])

  // Handle manual refresh
  const handleRefresh = () => {
    loadServices()
  }

  // Toggle auto-refresh
  const handleAutoRefreshToggle = (checked: boolean) => {
    setAutoRefresh(checked)
  }

  // Error state
  if (servicesError) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Title level={3}>{t('services.title')}</Title>
        </div>
        <Alert
          message={t('errors.loadFailed')}
          description={servicesError}
          type="error"
          showIcon
          action={
            <Button type="link" size="small" onClick={handleRefresh}>
              {t('common.retry')}
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Title level={3} className="!mb-1">{t('services.title')}</Title>
            <Text type="secondary">{t('services.subtitle')}</Text>
          </div>
          
          {/* Controls */}
          <Space size="large">
            {/* Service count badge */}
            <Badge
              count={runningServices.length}
              showZero
              style={{
                backgroundColor: runningServices.length > 0 ? token.colorSuccess : token.colorFillTertiary,
              }}
            >
              <Text type="secondary" className="pr-2">
                {t('services.title')}
              </Text>
            </Badge>

            {/* Auto-refresh toggle - Validates: Requirement 11.6 */}
            <Space>
              <Text type="secondary">{t('services.autoRefresh')}</Text>
              <Switch
                checked={autoRefresh}
                onChange={handleAutoRefreshToggle}
                checkedChildren="ON"
                unCheckedChildren="OFF"
              />
            </Space>

            {/* Manual refresh button */}
            <Button
              icon={<SyncOutlined spin={servicesLoading} />}
              onClick={handleRefresh}
              loading={servicesLoading}
            >
              {t('common.refresh')}
            </Button>
          </Space>
        </div>

        {/* Auto-refresh status message */}
        <div className="mt-2">
          <Text type="secondary" className="text-xs">
            {autoRefresh ? t('services.autoRefreshOn') : t('services.autoRefreshOff')}
          </Text>
        </div>
      </div>

      {/* Content */}
      {runningServices.length === 0 && !servicesLoading ? (
        <Empty
          description={
            <div>
              <Text>{t('empty.services')}</Text>
              <br />
              <Text type="secondary">{t('empty.servicesDescription')}</Text>
            </div>
          }
        />
      ) : (
        <ServiceTable
          services={runningServices}
          loading={servicesLoading}
          onKill={handleKillService}
          autoRefresh={autoRefresh}
        />
      )}
    </div>
  )
}

export default ServicesView
