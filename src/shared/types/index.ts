// Tool Information Model
export interface ToolInfo {
  name: string              // Tool name (e.g., "Node.js", "Python")
  displayName: string       // Localized display name
  version: string | null    // Version string (e.g., "v18.17.0")
  path: string | null       // Installation path
  isInstalled: boolean      // Installation status
  installMethod?: 'npm' | 'pip' | 'homebrew' | 'apt' | 'chocolatey' | 'manual'
  icon?: string             // Icon identifier
  category: 'runtime' | 'package-manager' | 'tool' | 'other'
}

// Package Information Model
export interface PackageInfo {
  name: string              // Package name
  version: string           // Version string
  location: string          // Installation location
  manager: 'npm' | 'pip' | 'composer'
  description?: string      // Package description
  homepage?: string         // Package homepage URL
}

// Running Service Model
export interface RunningService {
  pid: number               // Process ID
  name: string              // Process name
  port?: number             // Port number (if applicable)
  command: string           // Full command
  cpu?: number              // CPU usage percentage
  memory?: number           // Memory usage in MB
  startTime?: Date          // Process start time
}

// Environment Variable Model
export interface EnvironmentVariable {
  key: string               // Variable name
  value: string             // Variable value
  category: 'path' | 'java' | 'python' | 'node' | 'other'
  isSystemVariable: boolean // System vs User variable
}

// Command Result Model
export interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
  success: boolean
}

// IPC Channel Types
export type IPCChannels = 
  | 'tools:detect-all'
  | 'tools:detect-one'
  | 'packages:list-npm'
  | 'packages:list-pip'
  | 'packages:list-composer'
  | 'packages:uninstall'
  | 'services:list'
  | 'services:kill'
  | 'env:get-all'
  | 'env:get-path'
  | 'settings:get-language'
  | 'settings:set-language'

// Supported Languages
export type SupportedLanguage = 'zh-CN' | 'en-US'

// View Types
export type ViewType = 'tools' | 'packages' | 'services' | 'environment' | 'settings'

// AI Assistant Types
export interface AnalysisResult {
  summary: string
  issues: Issue[]
  suggestions: Suggestion[]
  insights: string[]
}

export interface Issue {
  severity: 'critical' | 'warning' | 'info'
  category: 'version' | 'conflict' | 'security' | 'performance' | 'configuration'
  title: string
  description: string
  affectedTools?: string[]
  solution?: string
}

export interface Suggestion {
  type: 'install' | 'update' | 'remove' | 'configure' | 'optimize'
  title: string
  description: string
  command?: string
  priority: 'high' | 'medium' | 'low'
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local'
  apiKey?: string
  model?: string
  enabled: boolean
}
