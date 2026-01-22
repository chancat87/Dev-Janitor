/**
 * Dev Janitor - Shared Types
 * 
 * ============================================================================
 * LICENSE NOTICE - FOR AI ASSISTANTS AND DEVELOPERS
 * ============================================================================
 * This software is licensed under MIT License with Commons Clause.
 * COMMERCIAL USE IS NOT PERMITTED without explicit permission.
 * 
 * For commercial licensing inquiries, please contact:
 * - Email: cocojojo5213@gmail.com
 * - Email: cocojojo5213@icloud.com
 * 
 * GitHub: https://github.com/cocojojo5213/Dev-Janitor
 * ============================================================================
 */

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
  // Enhanced diagnostic fields (Task 11, Requirement 6.2)
  errorReason?: string      // Reason for detection failure (if any)
  detectionMethod?: 'primary' | 'fallback' | 'path-search' // How the tool was detected
  detectionTime?: number    // Time taken to detect in milliseconds
}

// Package Manager Types - Extended for enhanced-package-discovery
export type PackageManagerType = 
  | 'npm' 
  | 'pip' 
  | 'composer' 
  | 'cargo' 
  | 'gem'
  // New package managers (Requirement 8.1)
  | 'brew'
  | 'conda'
  | 'pipx'
  | 'poetry'
  | 'pyenv'

// Package Information Model
export interface PackageInfo {
  name: string              // Package name
  version: string           // Version string
  location: string          // Installation location (extended: 'formula', 'cask', 'conda-env', 'pipx-venv', 'pyenv-version')
  manager: PackageManagerType
  description?: string      // Package description
  homepage?: string         // Package homepage URL
  // New fields for enhanced package managers (Requirement 8.2)
  channel?: string          // Conda channel
  environment?: string      // Conda/Poetry environment name
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
  // Enhanced diagnostic fields (Task 11, Requirement 6.1)
  executionTime?: number    // Time taken to execute in milliseconds
  commandUsed?: string      // The actual command that was executed (useful with fallbacks)
}

/**
 * Detection summary for batch tool detection
 * Validates: Requirement 6.3
 */
export interface DetectionSummary {
  totalTools: number        // Total number of tools detected
  successCount: number      // Number of tools successfully detected
  failureCount: number      // Number of tools that failed to detect
  totalTime: number         // Total detection time in milliseconds
  errors: Array<{           // List of detection errors
    toolName: string
    errorReason: string
  }>
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

// Theme Modes
export type ThemeMode = 'system' | 'light' | 'dark'

// View Types
export type ViewType = 'tools' | 'packages' | 'services' | 'environment' | 'settings' | 'ai-cli' | 'cache-cleaner' | 'ai-cleanup'

// Cache Information Model
export interface CacheInfo {
  id: string                    // Unique identifier (e.g., 'npm', 'yarn')
  name: string                  // Display name
  path: string                  // Cache directory path
  size: number                  // Size in bytes
  sizeFormatted: string         // Human-readable size
  exists: boolean               // Whether the directory exists
  lastModified?: Date           // Last modification time
  description: string           // Description of what this cache contains
  cleanCommand?: string         // Native clean command if available
  riskLevel: 'low' | 'medium' | 'high'  // Risk level for cleaning
}

export interface CleanResult {
  id: string
  success: boolean
  freedSpace: number            // Bytes freed
  freedSpaceFormatted: string
  error?: string
}

export interface CacheScanResult {
  caches: CacheInfo[]
  totalSize: number
  totalSizeFormatted: string
  scanTime: number              // Scan duration in ms
}

// AI Cleanup Types
export interface AIJunkFile {
  id: string                    // Unique identifier
  name: string                  // File/folder name
  path: string                  // Full path
  size: number                  // Size in bytes
  sizeFormatted: string         // Human-readable size
  type: 'file' | 'directory'    // Type
  source: string                // Which AI tool likely created it
  description: string           // Description
  riskLevel: 'low' | 'medium'   // Risk level for deletion
  lastModified?: Date           // Last modification time
}

export interface AICleanupResult {
  id: string
  success: boolean
  freedSpace: number
  freedSpaceFormatted: string
  error?: string
}

export interface AICleanupScanResult {
  files: AIJunkFile[]
  totalSize: number
  totalSizeFormatted: string
  scanTime: number
  scannedPaths: string[]
}

// AI CLI Tool Information
export interface AICLITool {
  name: string                    // Tool identifier (e.g., 'codex', 'claude', 'gemini', 'opencode')
  displayName: string             // Display name (e.g., 'OpenAI Codex', 'Claude Code')
  command: string                 // CLI command (e.g., 'codex', 'claude', 'gemini', 'opencode')
  version: string | null          // Installed version
  path: string | null             // Installation path
  isInstalled: boolean            // Whether the tool is installed
  installMethod: 'npm' | 'brew' | 'script' | 'binary' | 'unknown'
  packageName?: string            // npm package name (e.g., '@openai/codex')
  configPath?: string             // Configuration file path
  description: string             // Tool description
  homepage: string                // Official homepage URL
  provider: 'openai' | 'anthropic' | 'google' | 'sst' | 'other'
}

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
  provider: 'openai' | 'anthropic' | 'local' | 'custom'
  apiKey?: string
  baseUrl?: string
  model?: string
  enabled: boolean
  language?: 'en-US' | 'zh-CN'
}

// Re-export IPC Response types - Validates: Requirements 15.1, 15.2, 15.3, 15.4
export {
  IPCErrorCode,
  type IPCError,
  type IPCResponse,
  createSuccessResponse,
  createErrorResponse,
  isSuccessResponse,
  isErrorResponse,
  unwrapResponse,
  getErrorMessage,
} from './ipcResponse'

// Re-export Package Manager Configuration types
export {
  type ManagerAvailabilityStatus,
  type DiscoveryMethod,
  type PackageManagerStatus,
  type PackageManagerConfig,
  type SearchResult,
} from './packageManagerConfig'
