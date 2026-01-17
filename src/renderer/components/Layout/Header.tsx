/**
 * Header Component
 * 
 * Displays the application header with:
 * - Logo and title
 * - Language switcher
 * - Refresh button
 * 
 * Validates: Requirements 5.1, 7.1, 13.3
 */

import React from 'react'
import { Layout, Button, Space, Tooltip, Dropdown, theme } from 'antd'
import { ReloadOutlined, GlobalOutlined, ToolOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import type { SupportedLanguage } from '@shared/types'

const { Header: AntHeader } = Layout

interface HeaderProps {
  onRefresh: () => void
  loading?: boolean
}

const Header: React.FC<HeaderProps> = ({ onRefresh, loading = false }) => {
  const { t, i18n } = useTranslation()
  const { language, setLanguage } = useAppStore()
  const { token } = theme.useToken()

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang)
    i18n.changeLanguage(lang)
  }

  const languageMenuItems = [
    {
      key: 'en-US',
      label: 'English',
      onClick: () => handleLanguageChange('en-US'),
    },
    {
      key: 'zh-CN',
      label: '中文',
      onClick: () => handleLanguageChange('zh-CN'),
    },
  ]

  return (
    <AntHeader
      className="flex items-center justify-between px-6 h-16"
      style={{
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      {/* Logo and Title */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ background: token.colorPrimary }}
        >
          <ToolOutlined style={{ color: token.colorTextLightSolid, fontSize: 20 }} />
        </div>
        <div>
          <h1 className="text-lg font-semibold m-0 leading-tight" style={{ color: token.colorText }}>
            {t('header.title')}
          </h1>
          <p className="text-xs m-0 leading-tight" style={{ color: token.colorTextSecondary }}>
            {t('app.description').substring(0, 50)}...
          </p>
        </div>
      </div>

      {/* Actions */}
      <Space size="middle">
        {/* Language Switcher */}
        <Tooltip title={t('header.languageTooltip')}>
          <Dropdown
            menu={{ items: languageMenuItems, selectedKeys: [language] }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button icon={<GlobalOutlined />}>
              {language === 'zh-CN' ? '中文' : 'English'}
            </Button>
          </Dropdown>
        </Tooltip>

        {/* Refresh Button */}
        <Tooltip title={t('header.refreshTooltip')}>
          <Button
            type="primary"
            icon={<ReloadOutlined spin={loading} />}
            onClick={onRefresh}
            loading={loading}
          >
            {t('common.refresh')}
          </Button>
        </Tooltip>
      </Space>
    </AntHeader>
  )
}

export default Header
