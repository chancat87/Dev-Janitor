/**
 * AI Assistant Drawer Component
 * 
 * Provides AI-powered analysis and suggestions for the development environment
 */

import React, { useState } from 'react'
import { Drawer, Button, Spin, Alert, Card, Tag, Space, Divider, Typography, Collapse } from 'antd'
import { 
  RobotOutlined, 
  BulbOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { AnalysisResult, Issue, Suggestion } from '../../../shared/types'

const { Title, Text, Paragraph } = Typography
const { Panel } = Collapse

interface AIAssistantDrawerProps {
  open: boolean
  onClose: () => void
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ open, onClose }) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.ai.analyze()
      setAnalysis(result)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityIcon = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />
      case 'info':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />
    }
  }

  const getSeverityColor = (severity: Issue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'error'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
    }
  }

  const getPriorityColor = (priority: Suggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'red'
      case 'medium':
        return 'orange'
      case 'low':
        return 'blue'
    }
  }

  return (
    <Drawer
      title={
        <Space>
          <RobotOutlined />
          <span>{t('ai.title', 'AI 助手')}</span>
        </Space>
      }
      placement="right"
      width={600}
      onClose={onClose}
      open={open}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Analyze Button */}
        <Button
          type="primary"
          icon={<RobotOutlined />}
          onClick={handleAnalyze}
          loading={loading}
          block
          size="large"
        >
          {t('ai.analyze', '分析环境')}
        </Button>

        {/* Loading State */}
        {loading && (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="large" />
              <Paragraph style={{ marginTop: 16 }}>
                {t('ai.analyzing', '正在分析您的开发环境...')}
              </Paragraph>
            </div>
          </Card>
        )}

        {/* Analysis Results */}
        {analysis && !loading && (
          <>
            {/* Summary */}
            <Alert
              message={t('ai.summary', '环境概览')}
              description={analysis.summary}
              type="info"
              showIcon
            />

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <Card
                title={
                  <Space>
                    <WarningOutlined />
                    <span>{t('ai.issues', '发现的问题')} ({analysis.issues.length})</span>
                  </Space>
                }
                size="small"
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {analysis.issues.map((issue, index) => (
                    <Card key={index} size="small" type="inner">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          {getSeverityIcon(issue.severity)}
                          <Text strong>{issue.title}</Text>
                          <Tag color={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Tag>
                          <Tag>{issue.category}</Tag>
                        </Space>
                        <Text type="secondary">{issue.description}</Text>
                        {issue.solution && (
                          <Alert
                            message={t('ai.solution', '解决方案')}
                            description={issue.solution}
                            type="success"
                            showIcon
                            icon={<CheckCircleOutlined />}
                          />
                        )}
                        {issue.affectedTools && issue.affectedTools.length > 0 && (
                          <div>
                            <Text type="secondary">{t('ai.affectedTools', '影响的工具')}: </Text>
                            {issue.affectedTools.map(tool => (
                              <Tag key={tool}>{tool}</Tag>
                            ))}
                          </div>
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <Card
                title={
                  <Space>
                    <BulbOutlined />
                    <span>{t('ai.suggestions', '优化建议')} ({analysis.suggestions.length})</span>
                  </Space>
                }
                size="small"
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {analysis.suggestions.map((suggestion, index) => (
                    <Card key={index} size="small" type="inner">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          <Text strong>{suggestion.title}</Text>
                          <Tag color={getPriorityColor(suggestion.priority)}>
                            {suggestion.priority}
                          </Tag>
                          <Tag>{suggestion.type}</Tag>
                        </Space>
                        <Text type="secondary">{suggestion.description}</Text>
                        {suggestion.command && (
                          <Alert
                            message={t('ai.command', '执行命令')}
                            description={
                              <code style={{ 
                                background: '#f5f5f5', 
                                padding: '4px 8px', 
                                borderRadius: 4,
                                display: 'block'
                              }}>
                                {suggestion.command}
                              </code>
                            }
                            type="info"
                          />
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}

            {/* AI Insights */}
            {analysis.insights.length > 0 && (
              <Card
                title={
                  <Space>
                    <RobotOutlined />
                    <span>{t('ai.insights', 'AI 深度分析')}</span>
                  </Space>
                }
                size="small"
              >
                <Collapse ghost>
                  {analysis.insights.map((insight, index) => (
                    <Panel 
                      header={t('ai.insightDetail', `分析 ${index + 1}`)} 
                      key={index}
                    >
                      <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                        {insight}
                      </Paragraph>
                    </Panel>
                  ))}
                </Collapse>
              </Card>
            )}

            {/* No Issues */}
            {analysis.issues.length === 0 && analysis.suggestions.length === 0 && (
              <Alert
                message={t('ai.allGood', '环境状态良好')}
                description={t('ai.allGoodDesc', '未发现明显问题，您的开发环境配置良好！')}
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
              />
            )}
          </>
        )}

        {/* Help Text */}
        {!analysis && !loading && (
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={5}>{t('ai.helpTitle', 'AI 助手能做什么？')}</Title>
              <ul style={{ paddingLeft: 20 }}>
                <li>{t('ai.help1', '检测版本过旧或不兼容的工具')}</li>
                <li>{t('ai.help2', '发现环境配置问题')}</li>
                <li>{t('ai.help3', '提供优化建议')}</li>
                <li>{t('ai.help4', '推荐安装常用工具')}</li>
              </ul>
              <Divider />
              <Text type="secondary">
                {t('ai.helpNote', '点击"分析环境"按钮开始智能分析')}
              </Text>
            </Space>
          </Card>
        )}
      </Space>
    </Drawer>
  )
}
