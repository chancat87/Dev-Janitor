/**
 * IPC Handlers Module
 * 
 * Registers all IPC handlers for communication between main and renderer processes.
 * Handles channels for:
 * - Tools detection
 * - Package management
 * - Service monitoring
 * - Environment scanning
 * - Settings management
 * 
 * Validates: Requirements 1.1, 3.1, 4.1, 10.1, 11.1
 */

import { ipcMain, BrowserWindow } from 'electron'
import { detectionEngine } from './detectionEngine'
import { packageManager } from './packageManager'
import { serviceMonitor } from './serviceMonitor'
import { environmentScanner } from './environmentScanner'
import { aiAssistant } from './aiAssistant'
import type { ToolInfo, PackageInfo, RunningService, EnvironmentVariable, AnalysisResult, AIConfig } from '../shared/types'

// Store for language preference
let currentLanguage = 'en-US'

/**
 * Send event to all renderer windows
 * @param channel The event channel name
 * @param data The data to send
 */
function sendToAllWindows(channel: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }
}

/**
 * Register all IPC handlers for tools detection
 * 
 * Validates: Requirement 1.1 (System starts, Detection_Engine scans)
 */
function registerToolsHandlers(): void {
  // Detect all tools
  ipcMain.handle('tools:detect-all', async (): Promise<ToolInfo[]> => {
    try {
      const tools = await detectionEngine.detectAllTools()
      return tools
    } catch (error) {
      console.error('Error detecting tools:', error)
      sendToAllWindows('error', `Failed to detect tools: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return []
    }
  })

  // Detect a single tool by name
  ipcMain.handle('tools:detect-one', async (_event, toolName: string): Promise<ToolInfo> => {
    try {
      const tool = await detectionEngine.detectTool(toolName)
      return tool
    } catch (error) {
      console.error(`Error detecting tool ${toolName}:`, error)
      sendToAllWindows('error', `Failed to detect ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return {
        name: toolName,
        displayName: toolName,
        version: null,
        path: null,
        isInstalled: false,
        category: 'other',
      }
    }
  })
}

/**
 * Register all IPC handlers for package management
 * 
 * Validates: Requirements 3.1, 4.1
 */
function registerPackagesHandlers(): void {
  // List npm global packages
  ipcMain.handle('packages:list-npm', async (): Promise<PackageInfo[]> => {
    try {
      const packages = await packageManager.listNpmPackages()
      return packages
    } catch (error) {
      console.error('Error listing npm packages:', error)
      sendToAllWindows('error', `Failed to list npm packages: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return []
    }
  })

  // List pip packages
  ipcMain.handle('packages:list-pip', async (): Promise<PackageInfo[]> => {
    try {
      const packages = await packageManager.listPipPackages()
      return packages
    } catch (error) {
      console.error('Error listing pip packages:', error)
      sendToAllWindows('error', `Failed to list pip packages: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return []
    }
  })

  // List composer global packages
  ipcMain.handle('packages:list-composer', async (): Promise<PackageInfo[]> => {
    try {
      const packages = await packageManager.listComposerPackages()
      return packages
    } catch (error) {
      console.error('Error listing composer packages:', error)
      sendToAllWindows('error', `Failed to list composer packages: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return []
    }
  })

  // Uninstall a package
  ipcMain.handle('packages:uninstall', async (_event, name: string, manager: string): Promise<boolean> => {
    try {
      if (manager !== 'npm' && manager !== 'pip' && manager !== 'composer') {
        throw new Error(`Invalid package manager: ${manager}`)
      }
      const success = await packageManager.uninstallPackage(name, manager)
      return success
    } catch (error) {
      console.error(`Error uninstalling package ${name}:`, error)
      sendToAllWindows('error', `Failed to uninstall ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  })
}

/**
 * Register all IPC handlers for service monitoring
 * 
 * Validates: Requirement 11.1
 */
function registerServicesHandlers(): void {
  // List running services
  ipcMain.handle('services:list', async (): Promise<RunningService[]> => {
    try {
      const services = await serviceMonitor.listRunningServices()
      return services
    } catch (error) {
      console.error('Error listing services:', error)
      sendToAllWindows('error', `Failed to list services: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return []
    }
  })

  // Kill a service by PID
  ipcMain.handle('services:kill', async (_event, pid: number): Promise<boolean> => {
    try {
      const success = await serviceMonitor.killService(pid)
      return success
    } catch (error) {
      console.error(`Error killing service ${pid}:`, error)
      sendToAllWindows('error', `Failed to kill service: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  })
}

/**
 * Register all IPC handlers for environment scanning
 * 
 * Validates: Requirement 10.1
 */
function registerEnvironmentHandlers(): void {
  // Get all environment variables
  ipcMain.handle('env:get-all', async (): Promise<EnvironmentVariable[]> => {
    try {
      const variables = environmentScanner.getAllEnvironmentVariables()
      return variables
    } catch (error) {
      console.error('Error getting environment variables:', error)
      sendToAllWindows('error', `Failed to get environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return []
    }
  })

  // Get PATH entries
  ipcMain.handle('env:get-path', async (): Promise<string[]> => {
    try {
      const pathEntries = environmentScanner.getPathEntries()
      return pathEntries
    } catch (error) {
      console.error('Error getting PATH entries:', error)
      sendToAllWindows('error', `Failed to get PATH entries: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return []
    }
  })
}

/**
 * Register all IPC handlers for settings
 */
function registerSettingsHandlers(): void {
  // Get current language
  ipcMain.handle('settings:get-language', async (): Promise<string> => {
    return currentLanguage
  })

  // Set language
  ipcMain.handle('settings:set-language', async (_event, lang: string): Promise<void> => {
    if (lang === 'zh-CN' || lang === 'en-US') {
      currentLanguage = lang
      // Notify all windows of language change
      sendToAllWindows('settings:language-changed', lang)
    }
  })
}

/**
 * Register all IPC handlers for AI assistant
 */
function registerAIHandlers(): void {
  // Analyze environment
  ipcMain.handle('ai:analyze', async (): Promise<AnalysisResult> => {
    try {
      // Gather all data
      const tools = await detectionEngine.detectAllTools()
      const npmPackages = await packageManager.listNpmPackages()
      const pipPackages = await packageManager.listPipPackages()
      const composerPackages = await packageManager.listComposerPackages()
      const packages = [...npmPackages, ...pipPackages, ...composerPackages]
      const services = await serviceMonitor.listRunningServices()
      const environment = environmentScanner.getAllEnvironmentVariables()
      
      // Perform analysis
      const result = await aiAssistant.analyze(tools, packages, environment, services)
      return result
    } catch (error) {
      console.error('Error analyzing environment:', error)
      return {
        summary: '分析失败',
        issues: [],
        suggestions: [],
        insights: [`错误: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  })

  // Update AI configuration
  ipcMain.handle('ai:update-config', async (_event, config: AIConfig): Promise<void> => {
    try {
      aiAssistant.updateConfig(config)
    } catch (error) {
      console.error('Error updating AI config:', error)
      sendToAllWindows('error', `Failed to update AI config: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
}

/**
 * Start service monitoring and send updates to renderer
 * 
 * Validates: Requirement 11.6 (refresh every 5 seconds)
 */
function startServiceMonitoring(): void {
  // Add listener for service updates
  serviceMonitor.addListener((services) => {
    sendToAllWindows('services:updated', services)
  })
  
  // Start monitoring with 5 second interval
  serviceMonitor.startMonitoring(5000)
}

/**
 * Stop service monitoring
 */
function stopServiceMonitoring(): void {
  serviceMonitor.stopMonitoring()
}

/**
 * Send detection progress to renderer
 * @param progress Progress percentage (0-100)
 */
export function sendDetectionProgress(progress: number): void {
  sendToAllWindows('detection:progress', progress)
}

/**
 * Send error to renderer
 * @param error Error message
 */
export function sendError(error: string): void {
  sendToAllWindows('error', error)
}

/**
 * Register all IPC handlers
 * Call this function during app initialization
 */
export function registerAllIPCHandlers(): void {
  registerToolsHandlers()
  registerPackagesHandlers()
  registerServicesHandlers()
  registerEnvironmentHandlers()
  registerSettingsHandlers()
  registerAIHandlers()
  
  // Start service monitoring
  startServiceMonitoring()
  
  console.log('All IPC handlers registered')
}

/**
 * Cleanup IPC handlers and stop monitoring
 * Call this function during app shutdown
 */
export function cleanupIPCHandlers(): void {
  stopServiceMonitoring()
  
  // Remove all handlers
  ipcMain.removeHandler('tools:detect-all')
  ipcMain.removeHandler('tools:detect-one')
  ipcMain.removeHandler('packages:list-npm')
  ipcMain.removeHandler('packages:list-pip')
  ipcMain.removeHandler('packages:list-composer')
  ipcMain.removeHandler('packages:uninstall')
  ipcMain.removeHandler('services:list')
  ipcMain.removeHandler('services:kill')
  ipcMain.removeHandler('env:get-all')
  ipcMain.removeHandler('env:get-path')
  ipcMain.removeHandler('settings:get-language')
  ipcMain.removeHandler('settings:set-language')
  ipcMain.removeHandler('ai:analyze')
  ipcMain.removeHandler('ai:update-config')
  
  console.log('All IPC handlers cleaned up')
}

export default {
  registerAllIPCHandlers,
  cleanupIPCHandlers,
  sendDetectionProgress,
  sendError,
}
