/**
 * Cache Cleaner View Component
 * 
 * Displays package manager caches and allows users to clean them.
 * 
 * ⚠️ WARNING: This is an advanced feature with destructive operations.
 * Users must understand the implications before proceeding.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Alert, 
  Modal, 
  Tooltip,
  Checkbox,
  message,
  Spin,
  Empty,
  Statistic,
  Row,
  Col,
} from 'antd'
import { 
  DeleteOutlined, 
  ReloadOutlined, 
  WarningOutlined,
  ExclamationCircleOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { CacheInfo, CleanResult, CacheScanResult } from '@shared/types'

const { Title, Text, Paragraph } = Typography

const CacheCleanerView: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [scanResult, setScanResult] = useState<CacheScanResult | null>(null)
  const [selectedCaches, setSelectedCaches] = useState<string[]>([])
  const [cleanResults, setCleanResults] = useState<CleanResult[]>([])
  const [showResultModal, setShowResultModal] = useState(false)
  const [warningAcknowledged, setWarningAcknowledged] = useState(false)

  // Scan caches on mount
  const scanCaches = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.cache.scanAll()
      setScanResult(result)
      setSelectedCaches([])
    } catch (error) {
      message.error(t('cacheCleaner.scanError'))
      console.error('Failed to scan caches:', error)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    scanCaches()
  }, [scanCaches])

  // Handle cache selection
  const handleSelectCache = (cacheId: string, checked: boolean) => {
    if (checked) {
      setSelectedCaches(prev => [...prev, cacheId])
    } else {
      setSelectedCaches(prev => prev.filter(id => id !== cacheId))
    }
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked && scanResult) {
      setSelectedCaches(scanResult.caches.map(c => c.id))
    } else {
      setSelectedCaches([])
    }
  }

  // Clean selected caches
  const handleCleanSelected = async () => {
    if (selectedCaches.length === 0) {
      message.warning(t('cacheCleaner.noSelection'))
      return
    }

    // Check for high-risk caches
    const highRiskSelected = scanResult?.caches
      .filter(c => selectedCaches.includes(c.id) && c.riskLevel === 'high')
      .map(c => c.name) || []

    Modal.confirm({
      title: t('cacheCleaner.confirmTitle'),
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <Paragraph>
            {t('cacheCleaner.confirmMessage', { count: selectedCaches.length })}
          </Paragraph>
          {highRiskSelected.length > 0 && (
            <Alert
              type="error"
              showIcon
              icon={<WarningOutlined />}
              message={t('cacheCleaner.highRiskWarning')}
              description={highRiskSelected.join(', ')}
              style={{ marginTop: 12 }}
            />
          )}
          <Paragraph type="warning" style={{ marginTop: 12 }}>
            <WarningOutlined /> {t('cacheCleaner.irreversibleWarning')}
          </Paragraph>
        </div>
      ),
      okText: t('cacheCleaner.confirmClean'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        setCleaning(true)
        try {
          const results = await window.electronAPI.cache.cleanMultiple(selectedCaches)
          setCleanResults(results)
          setShowResultModal(true)
          // Refresh cache list
          await scanCaches()
        } catch (error) {
          message.error(t('cacheCleaner.cleanError'))
          console.error('Failed to clean caches:', error)
        } finally {
          setCleaning(false)
        }
      },
    })
  }

  // Clean single cache
  const handleCleanSingle = async (cache: CacheInfo) => {
    const isHighRisk = cache.riskLevel === 'high'
    
    Modal.confirm({
      title: t('cacheCleaner.confirmSingleTitle', { name: cache.name }),
      icon: <ExclamationCircleOutlined style={{ color: isHighRisk ? '#ff4d4f' : '#faad14' }} />,
      content: (
        <div>
          <Paragraph>{cache.description}</Paragraph>
          {isHighRisk && (
            <Alert
              type="error"
              showIcon
              icon={<WarningOutlined />}
              message={t('cacheCleaner.highRiskSingleWarning')}
              style={{ marginTop: 12 }}
            />
          )}
          <Paragraph type="secondary" style={{ marginTop: 8 }}>
            {t('cacheCleaner.willFree', { size: cache.sizeFormatted })}
          </Paragraph>
        </div>
      ),
      okText: t('cacheCleaner.confirmClean'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        setCleaning(true)
        try {
          const result = await window.electronAPI.cache.clean(cache.id)
          if (result.success) {
            message.success(t('cacheCleaner.cleanSuccess', { 
              name: cache.name, 
              size: result.freedSpaceFormatted 
            }))
          } else {
            message.error(t('cacheCleaner.cleanFailed', { 
              name: cache.name, 
              error: result.error 
            }))
          }
          await scanCaches()
        } catch (error) {
          message.error(t('cacheCleaner.cleanError'))
          console.error('Failed to clean cache:', error)
        } finally {
          setCleaning(false)
        }
      },
    })
  }

  // Open cache folder
  const handleOpenFolder = async (path: string) => {
    try {
      await window.electronAPI.shell.openPath(path)
    } catch (error) {
      message.error(t('cacheCleaner.openFolderError'))
    }
  }

  // Get risk level tag
  const getRiskTag = (level: 'low' | 'medium' | 'high') => {
    const config = {
      low: { color: 'green', text: t('cacheCleaner.riskLow') },
      medium: { color: 'orange', text: t('cacheCleaner.riskMedium') },
      high: { color: 'red', text: t('cacheCleaner.riskHigh') },
    }
    return <Tag color={config[level].color}>{config[level].text}</Tag>
  }

  // Table columns
  const columns = [
    {
      title: (
        <Checkbox
          checked={selectedCaches.length === scanResult?.caches.length && scanResult?.caches.length > 0}
          indeterminate={selectedCaches.length > 0 && selectedCaches.length < (scanResult?.caches.length || 0)}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
      ),
      dataIndex: 'select',
      width: 50,
      render: (_: unknown, record: CacheInfo) => (
        <Checkbox
          checked={selectedCaches.includes(record.id)}
          onChange={(e) => handleSelectCache(record.id, e.target.checked)}
        />
      ),
    },
    {
      title: t('cacheCleaner.columnName'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: CacheInfo) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Tooltip title={record.path}>
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {record.path}
            </Text>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: t('cacheCleaner.columnSize'),
      dataIndex: 'sizeFormatted',
      key: 'size',
      width: 120,
      sorter: (a: CacheInfo, b: CacheInfo) => a.size - b.size,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: t('cacheCleaner.columnRisk'),
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 100,
      render: (level: 'low' | 'medium' | 'high') => getRiskTag(level),
      filters: [
        { text: t('cacheCleaner.riskLow'), value: 'low' },
        { text: t('cacheCleaner.riskMedium'), value: 'medium' },
        { text: t('cacheCleaner.riskHigh'), value: 'high' },
      ],
      onFilter: (value: React.Key | boolean, record: CacheInfo) => record.riskLevel === value,
    },
    {
      title: t('cacheCleaner.columnDescription'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => (
        <Tooltip title={desc}>
          <Text type="secondary">{desc}</Text>
        </Tooltip>
      ),
    },
    {
      title: t('cacheCleaner.columnActions'),
      key: 'actions',
      width: 150,
      render: (_: unknown, record: CacheInfo) => (
        <Space>
          <Tooltip title={t('cacheCleaner.openFolder')}>
            <Button
              type="text"
              icon={<FolderOpenOutlined />}
              onClick={() => handleOpenFolder(record.path)}
            />
          </Tooltip>
          <Tooltip title={t('cacheCleaner.cleanThis')}>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleCleanSingle(record)}
              loading={cleaning}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  // Calculate selected size
  const selectedSize = scanResult?.caches
    .filter(c => selectedCaches.includes(c.id))
    .reduce((sum, c) => sum + c.size, 0) || 0
  
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="p-6">
      {/* Warning Banner */}
      {!warningAcknowledged && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={t('cacheCleaner.advancedFeatureTitle')}
          description={
            <div>
              <Paragraph>{t('cacheCleaner.advancedFeatureDesc')}</Paragraph>
              <ul style={{ marginBottom: 12 }}>
                <li>{t('cacheCleaner.warning1')}</li>
                <li>{t('cacheCleaner.warning2')}</li>
                <li>{t('cacheCleaner.warning3')}</li>
              </ul>
              <Button 
                type="primary" 
                size="small"
                onClick={() => setWarningAcknowledged(true)}
              >
                {t('cacheCleaner.iUnderstand')}
              </Button>
            </div>
          }
          style={{ marginBottom: 24 }}
          closable={false}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {t('cacheCleaner.title')}
          </Title>
          <Text type="secondary">{t('cacheCleaner.subtitle')}</Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={scanCaches}
            loading={loading}
          >
            {t('cacheCleaner.refresh')}
          </Button>
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            onClick={handleCleanSelected}
            disabled={selectedCaches.length === 0 || !warningAcknowledged}
            loading={cleaning}
          >
            {t('cacheCleaner.cleanSelected')} ({selectedCaches.length})
          </Button>
        </Space>
      </div>

      {/* Statistics */}
      {scanResult && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title={t('cacheCleaner.totalCaches')}
                value={scanResult.caches.length}
                suffix={t('cacheCleaner.items')}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title={t('cacheCleaner.totalSize')}
                value={scanResult.totalSizeFormatted}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title={t('cacheCleaner.selectedSize')}
                value={formatBytes(selectedSize)}
                valueStyle={{ color: selectedSize > 0 ? '#cf1322' : undefined }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Cache Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spin size="large" tip={t('cacheCleaner.scanning')} />
          </div>
        ) : scanResult?.caches.length === 0 ? (
          <Empty
            description={t('cacheCleaner.noCaches')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            dataSource={scanResult?.caches || []}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="middle"
            loading={cleaning}
          />
        )}
      </Card>

      {/* Scan Info */}
      {scanResult && (
        <div className="mt-4 text-right">
          <Text type="secondary">
            {t('cacheCleaner.scanTime', { time: scanResult.scanTime })}
          </Text>
        </div>
      )}

      {/* Results Modal */}
      <Modal
        title={t('cacheCleaner.resultsTitle')}
        open={showResultModal}
        onOk={() => setShowResultModal(false)}
        onCancel={() => setShowResultModal(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setShowResultModal(false)}>
            {t('common.ok')}
          </Button>
        ]}
      >
        <div>
          {cleanResults.map(result => (
            <div key={result.id} className="flex items-center justify-between py-2 border-b">
              <Space>
                {result.success ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <Text>{result.id}</Text>
              </Space>
              <Text type={result.success ? 'success' : 'danger'}>
                {result.success 
                  ? t('cacheCleaner.freed', { size: result.freedSpaceFormatted })
                  : result.error
                }
              </Text>
            </div>
          ))}
          <div className="mt-4 pt-4 border-t">
            <Text strong>
              {t('cacheCleaner.totalFreed', { 
                size: formatBytes(cleanResults.reduce((sum, r) => sum + r.freedSpace, 0))
              })}
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default CacheCleanerView
