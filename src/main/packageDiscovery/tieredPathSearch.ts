/**
 * Dev Janitor - Tiered Path Search
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

import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'
import { PathCache } from './pathCache'
import { SearchResult, PackageManagerConfig } from '../../shared/types/packageManagerConfig'
import { executeSafe } from '../commandExecutor'

/**
 * Tiered Path Search
 * Implements four-tier search strategy for package manager executables
 * Validates: Requirements 10.1, 10.6, 13.3, 13.4
 */
export class TieredPathSearch {
  private cache: PathCache
  private customConfig?: PackageManagerConfig

  /**
   * Create a new TieredPathSearch instance
   * @param cache Path cache instance
   * @param customConfig Optional custom configuration
   */
  constructor(cache: PathCache, customConfig?: PackageManagerConfig) {
    this.cache = cache
    this.customConfig = customConfig
  }

  /**
   * Search for package manager executable using tiered strategy
   * Validates: Requirements 10.1, 10.6, 13.3, 13.4
   * 
   * Tier 1: Direct command check (fastest)
   * Tier 2: PATH environment scan
   * Tier 3: Common paths search
   * Tier 4: Custom config paths
   * 
   * @param executable Executable file name
   * @param commonPaths Common installation paths
   * @returns SearchResult or null if not found
   */
  async findExecutable(
    executable: string,
    commonPaths: string[]
  ): Promise<SearchResult | null> {
    // Check cache first
    const cachedPath = this.cache.getPath(executable)
    if (cachedPath !== undefined) {
      if (cachedPath === null) {
        return null
      }
      // Return cached result with method from cache metadata
      // For now, we'll assume cached paths are from direct command
      return {
        path: cachedPath,
        method: 'direct_command',
        inPath: true
      }
    }

    // Tier 1: Direct command check
    const tier1Result = await this.checkDirectCommand(executable)
    if (tier1Result) {
      this.cache.setPath(executable, tier1Result.path)
      return tier1Result
    }

    // Tier 2: PATH environment scan
    const tier2Result = await this.scanPathEnvironment(executable)
    if (tier2Result) {
      this.cache.setPath(executable, tier2Result.path)
      return tier2Result
    }

    // Tier 3: Common paths search
    const tier3Result = await this.searchCommonPaths(executable, commonPaths)
    if (tier3Result) {
      this.cache.setPath(executable, tier3Result.path)
      return tier3Result
    }

    // Tier 4: Custom config paths
    const tier4Result = await this.searchCustomPaths(executable)
    if (tier4Result) {
      this.cache.setPath(executable, tier4Result.path)
      return tier4Result
    }

    // Not found - cache the negative result
    this.cache.setPath(executable, null)
    return null
  }

  /**
   * Tier 1: Direct command check
   * Validates: Requirement 13.3
   * @param executable Executable file name
   * @returns SearchResult or null
   */
  private async checkDirectCommand(executable: string): Promise<SearchResult | null> {
    // Try to execute the command with --version to check availability
    const result = await executeSafe(`${executable} --version`)
    
    if (result.success) {
      return {
        path: executable,
        method: 'direct_command',
        inPath: true
      }
    }

    return null
  }

  /**
   * Tier 2: PATH environment scan
   * Validates: Requirements 12.1, 12.2, 13.3
   * @param executable Executable file name
   * @returns SearchResult or null
   */
  private async scanPathEnvironment(executable: string): Promise<SearchResult | null> {
    const pathEnv = process.env.PATH || ''
    const pathSeparator = process.platform === 'win32' ? ';' : ':'
    const pathDirs = pathEnv.split(pathSeparator).filter(dir => dir.trim())

    // Scan each directory in PATH
    for (const dir of pathDirs) {
      try {
        const executablePath = await this.checkExecutableInDirectory(dir, executable)
        if (executablePath) {
          // Verify it's actually executable
          const isValid = await this.verifyExecutable(executablePath)
          if (isValid) {
            return {
              path: executablePath,
              method: 'path_scan',
              inPath: true
            }
          }
        }
      } catch {
        // Continue to next directory if this one fails
        continue
      }
    }

    return null
  }

  /**
   * Tier 3: Common paths search
   * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5
   * @param executable Executable file name
   * @param paths Common installation paths
   * @returns SearchResult or null
   */
  private async searchCommonPaths(
    _executable: string,
    paths: string[]
  ): Promise<SearchResult | null> {
    for (const commonPath of paths) {
      const expandedPath = this.expandPath(commonPath)
      const isValid = await this.verifyExecutable(expandedPath)
      
      if (isValid) {
        return {
          path: expandedPath,
          method: 'common_path',
          inPath: false
        }
      }
    }

    return null
  }

  /**
   * Tier 4: Custom config paths
   * Validates: Requirements 11.1, 11.2
   * @param executable Executable file name
   * @returns SearchResult or null
   */
  private async searchCustomPaths(executable: string): Promise<SearchResult | null> {
    if (!this.customConfig?.customPaths) {
      return null
    }

    // Find custom paths for this executable
    // Map executable names to config keys
    const configKey = this.getConfigKeyForExecutable(executable)
    const customPaths = this.customConfig.customPaths[configKey as keyof typeof this.customConfig.customPaths]

    if (!customPaths || customPaths.length === 0) {
      return null
    }

    for (const customPath of customPaths) {
      const expandedPath = this.expandPath(customPath)
      const isValid = await this.verifyExecutable(expandedPath)
      
      if (isValid) {
        return {
          path: expandedPath,
          method: 'custom_path',
          inPath: false
        }
      }
    }

    return null
  }

  /**
   * Check if executable exists in a directory
   * @param dir Directory path
   * @param executable Executable file name
   * @returns Full path to executable or null
   */
  private async checkExecutableInDirectory(
    dir: string,
    executable: string
  ): Promise<string | null> {
    try {
      const executablePath = path.join(dir, executable)
      const stats = await fs.stat(executablePath)
      
      if (stats.isFile()) {
        return executablePath
      }

      // On Windows, also check with .exe extension
      if (process.platform === 'win32' && !executable.endsWith('.exe')) {
        const exePath = `${executablePath}.exe`
        const exeStats = await fs.stat(exePath)
        if (exeStats.isFile()) {
          return exePath
        }
      }
    } catch {
      // File doesn't exist or can't be accessed
    }

    return null
  }

  /**
   * Verify that a path points to a valid executable
   * @param executablePath Path to verify
   * @returns true if valid and executable
   */
  private async verifyExecutable(executablePath: string): Promise<boolean> {
    try {
      // Check if file exists
      const stats = await fs.stat(executablePath)
      if (!stats.isFile()) {
        return false
      }

      // Try to execute with --version to verify it's actually executable
      const result = await executeSafe(`"${executablePath}" --version`)
      return result.success
    } catch {
      return false
    }
  }

  /**
   * Expand path with home directory and environment variables
   * @param pathStr Path string to expand
   * @returns Expanded path
   */
  private expandPath(pathStr: string): string {
    // Expand ~ to home directory
    if (pathStr.startsWith('~')) {
      return path.join(os.homedir(), pathStr.slice(1))
    }

    // Expand environment variables on Windows
    if (process.platform === 'win32') {
      return pathStr.replace(/%([^%]+)%/g, (_, varName) => {
        return process.env[varName] || `%${varName}%`
      })
    }

    return pathStr
  }

  /**
   * Map executable name to config key
   * @param executable Executable file name
   * @returns Config key
   */
  private getConfigKeyForExecutable(executable: string): string {
    // Remove .exe extension on Windows
    const baseName = executable.replace(/\.exe$/i, '')
    return baseName
  }

  /**
   * Load custom configuration from file
   * Validates: Requirements 11.1, 11.3, 11.4
   * @returns PackageManagerConfig or null
   */
  static async loadCustomConfig(): Promise<PackageManagerConfig | null> {
    try {
      const configPath = path.join(
        os.homedir(),
        '.config',
        'dev-janitor',
        'package-managers.json'
      )

      const configContent = await fs.readFile(configPath, 'utf-8')
      const config = JSON.parse(configContent) as PackageManagerConfig
      return config
    } catch {
      // Config file doesn't exist or is invalid - use defaults
      return null
    }
  }

  /**
   * Set custom configuration
   * @param config Custom configuration
   */
  setCustomConfig(config: PackageManagerConfig | undefined): void {
    this.customConfig = config
  }
}
