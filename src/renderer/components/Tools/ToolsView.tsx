/**
 * ToolsView Component
 * 
 * Main view for displaying all detected development tools:
 * - Grid layout of ToolCards
 * - Loading state with skeleton
 * - Empty state when no tools detected
 * - Tool detail modal
 * - Category filtering
 * 
 * Validates: Requirements 2.1, 5.1, 5.2, 5.3, 5.4, 5.5, 7.4
 * Property 4: All Tools Display
 * Property 7: Tool Categorization
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Typography, Row, Col, Skeleton, Empty, Segmented, Progress, Alert, Button } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import ToolCard from './ToolCard'
import ToolDetailModal from './ToolDetailModal'
import type { ToolInfo } from '@shared/types'

const { Title, Text } = Typography

type CategoryFilter = 'all' | 'runtime' | 'package-manager' | 'tool' | 'other'

const ToolsView: React.FC = () => {
  const { t } = useTranslation()
  const {
    tools,
    toolsLoading,
    toolsError,
    detectionProgress,
    loadTools,
  } = useAppStore()

  const [selectedTool, setSelectedTool] = useState<ToolInfo | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  // Load tools on mount
  useEffect(() => {
    if (tools.length === 0 && !toolsLoading) {
      loadTools()
    }
  }, [tools.length, toolsLoading, loadTools])

  // Filter tools by category - Validates: Property 7
  const filteredTools = useMemo(() => {
    if (categoryFilter === 'all') {
      return tools
    }
    return tools.filter(tool => tool.category === categoryFilter)
  }, [tools, categoryFilter])

  // Note: toolsByCategory can be used for grouped display in future enhancements
  // Currently using flat filtered list with category filter

  const handleViewDetails = (tool: ToolInfo) => {
    setSelectedTool(tool)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedTool(null)
  }

  const handleRefreshTool = () => {
    loadTools()
  }

  // Category filter options
  const categoryOptions = [
    { label: t('common.all'), value: 'all' },
    { label: t('tools.categories.runtime'), value: 'runtime' },
    { label: t('tools.categories.packageManager'), value: 'package-manager' },
    { label: t('tools.categories.tool'), value: 'tool' },
    { label: t('tools.categories.other'), value: 'other' },
  ]

  // Loading state with skeleton - Validates: Requirement 7.4
  if (toolsLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Title level={3}>{t('tools.title')}</Title>
          <Text type="secondary">{t('tools.detecting')}</Text>
        </div>
        
        {/* Progress indicator - Validates: Requirement 7.4 */}
        {detectionProgress > 0 && detectionProgress < 100 && (
          <div className="mb-6">
            <Text type="secondary">{t('tools.detectionProgress')}</Text>
            <Progress percent={detectionProgress} status="active" />
          </div>
        )}
        
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Col key={i} xs={24} sm={12} lg={8} xl={6}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Col>
          ))}
        </Row>
      </div>
    )
  }

  // Error state
  if (toolsError) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Title level={3}>{t('tools.title')}</Title>
        </div>
        <Alert
          message={t('errors.detectionFailed')}
          description={toolsError}
          type="error"
          showIcon
          action={
            <Button type="link" size="small" onClick={loadTools}>
              {t('common.retry')}
            </Button>
          }
        />
      </div>
    )
  }

  // Empty state
  if (tools.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <Title level={3}>{t('tools.title')}</Title>
          <Text type="secondary">{t('tools.subtitle')}</Text>
        </div>
        <Empty
          description={
            <div>
              <Text>{t('empty.tools')}</Text>
              <br />
              <Text type="secondary">{t('empty.toolsDescription')}</Text>
            </div>
          }
        />
      </div>
    )
  }

  // Main view - Validates: Property 4 (All Tools Display)
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Title level={3} className="!mb-1">{t('tools.title')}</Title>
        <Text type="secondary">{t('tools.subtitle')}</Text>
      </div>

      {/* Category Filter - Validates: Requirement 5.2 */}
      <div className="mb-6">
        <Segmented
          options={categoryOptions}
          value={categoryFilter}
          onChange={(value) => setCategoryFilter(value as CategoryFilter)}
        />
        <Text type="secondary" className="ml-4">
          {filteredTools.length} {t('tools.title').toLowerCase()}
        </Text>
      </div>

      {/* Tools Grid - Validates: Property 4 */}
      <Row gutter={[16, 16]}>
        {filteredTools.map((tool) => (
          <Col key={tool.name} xs={24} sm={12} lg={8} xl={6}>
            <ToolCard
              tool={tool}
              onRefresh={handleRefreshTool}
              onViewDetails={() => handleViewDetails(tool)}
            />
          </Col>
        ))}
      </Row>

      {/* Empty filtered state */}
      {filteredTools.length === 0 && tools.length > 0 && (
        <Empty
          description={t('common.noData')}
          className="mt-8"
        />
      )}

      {/* Tool Detail Modal */}
      <ToolDetailModal
        tool={selectedTool}
        open={modalOpen}
        onClose={handleCloseModal}
        onRefresh={handleRefreshTool}
      />
    </div>
  )
}

export default ToolsView
