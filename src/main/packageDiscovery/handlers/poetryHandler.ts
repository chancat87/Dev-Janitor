/**
 * Dev Janitor - Poetry Package Manager Handler
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

import { PackageInfo } from '../../../shared/types'
import { PackageManagerHandler, UninstallOptions } from '../types'
import { executeSafe } from '../../commandExecutor'
import { TieredPathSearch } from '../tieredPathSearch'
import { PathCache } from '../pathCache'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

/**
 * Poetry Package Manager Handler
 * Supports Poetry global package discovery
 * Validates: Requirements 4.1, 4.2, 4.3
 */
export class PoetryHandler implements PackageManagerHandler {
  readonly id = 'poetry' as const
  readonly displayName = 'Poetry'
  readonly executable = 'poetry'
  readonly commonPaths = [
    '~/.local/bin/poetry',
    '~/.poetry/bin/poetry',
    '/usr/local/bin/poetry',
    // Windows paths
    '%APPDATA%\\Python\\Scripts\\poetry.exe',
    '%USERPROFILE%\\.local\\bin\\poetry.exe'
  ]

  private pathSearch: TieredPathSearch
  private poetryPath: string | null = null

  constructor(pathSearch?: TieredPathSearch) {
    this.pathSearch = pathSearch || new TieredPathSearch(new PathCache())
  }

  /**
   * Check if Poetry is available
   * Validates: Requirements 4.2, 6.1, 6.2, 6.3
   * @returns true if available, false otherwise
   */
  async checkAvailability(): Promise<boolean> {
    const searchResult = await this.pathSearch.findExecutable(
      this.executable,
      this.commonPaths
    )

    if (searchResult) {
      this.poetryPath = searchResult.path
      return true
    }

    return false
  }

  /**
   * List all installed packages from Poetry data directory
   * Validates: Requirement 4.1
   * @returns Array of package information
   */
  async listPackages(): Promise<PackageInfo[]> {
    try {
      // Get Poetry data directory
      const dataDir = await this.getPoetryDataDir()
      if (!dataDir) {
        return []
      }

      // Scan for virtualenvs in the data directory
      const packages = await this.scanPoetryDataDir(dataDir)
      return packages
    } catch {
      // If scanning fails, return empty array (Requirement 4.2)
      return []
    }
  }

  /**
   * Uninstall a package (Poetry doesn't support global uninstall directly)
   * Note: Poetry doesn't have a built-in global uninstall command
   * @param _packageName Name of the package to uninstall
   * @param _options Uninstall options (unused for poetry)
   * @returns false (not supported)
   */
  async uninstallPackage(_packageName: string, _options?: UninstallOptions): Promise<boolean> {
    // Poetry doesn't support global package uninstallation
    // Users need to manually remove the virtualenv directory
    return false
  }

  /**
   * Parse command output into PackageInfo array
   * Note: Poetry doesn't have a standard list command for global packages
   * This method is provided for interface compliance
   * Validates: Requirement 4.3
   * @param _output Command output string
   * @returns Empty array (not used for Poetry)
   */
  parseOutput(_output: string): PackageInfo[] {
    // Poetry doesn't use command output parsing
    // Package discovery is done via directory scanning
    return []
  }

  /**
   * Get Poetry data directory path
   * @returns Poetry data directory path or null if not found
   */
  private async getPoetryDataDir(): Promise<string | null> {
    try {
      const poetryCmd = this.poetryPath || this.executable
      const command = `${poetryCmd} config data-dir`
      const result = await executeSafe(command)

      if (result.success && result.stdout) {
        const dataDir = result.stdout.trim()
        return dataDir
      }

      // Fallback to default locations
      return this.getDefaultPoetryDataDir()
    } catch {
      return this.getDefaultPoetryDataDir()
    }
  }

  /**
   * Get default Poetry data directory based on OS
   * @returns Default Poetry data directory path
   */
  private getDefaultPoetryDataDir(): string {
    const homeDir = os.homedir()
    const platform = os.platform()

    if (platform === 'win32') {
      // Windows: %APPDATA%\pypoetry
      const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming')
      return path.join(appData, 'pypoetry')
    } else if (platform === 'darwin') {
      // macOS: ~/Library/Application Support/pypoetry
      return path.join(homeDir, 'Library', 'Application Support', 'pypoetry')
    } else {
      // Linux: ~/.local/share/pypoetry
      return path.join(homeDir, '.local', 'share', 'pypoetry')
    }
  }

  /**
   * Scan Poetry data directory for installed packages
   * Validates: Requirement 4.1
   * @param dataDir Poetry data directory path
   * @returns Array of package information
   */
  private async scanPoetryDataDir(dataDir: string): Promise<PackageInfo[]> {
    const packages: PackageInfo[] = []

    try {
      // Check if virtualenvs directory exists
      const virtualenvsDir = path.join(dataDir, 'virtualenvs')
      
      try {
        await fs.access(virtualenvsDir)
      } catch {
        // Directory doesn't exist
        return []
      }

      // Read virtualenvs directory
      const entries = await fs.readdir(virtualenvsDir, { withFileTypes: true })

      // Process each virtualenv directory
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue
        }

        try {
          // Parse virtualenv directory name
          // Format: projectname-hash-pyversion
          // Example: myproject-a1b2c3d4-py3.11
          const venvName = entry.name
          const packageInfo = await this.parseVirtualenvDir(virtualenvsDir, venvName)
          
          if (packageInfo) {
            packages.push(packageInfo)
          }
        } catch {
          // Skip malformed virtualenv directories
          continue
        }
      }
    } catch {
      // If directory scanning fails, return empty array
      return []
    }

    return packages
  }

  /**
   * Parse virtualenv directory to extract package information
   * @param virtualenvsDir Path to virtualenvs directory
   * @param venvName Virtualenv directory name
   * @returns Package information or null if parsing fails
   */
  private async parseVirtualenvDir(
    virtualenvsDir: string,
    venvName: string
  ): Promise<PackageInfo | null> {
    try {
      // Try to read pyproject.toml or poetry.lock from the virtualenv
      const venvPath = path.join(virtualenvsDir, venvName)
      
      // Parse the virtualenv name to extract project name
      // Format: projectname-hash-pyversion
      const parts = venvName.split('-')
      
      if (parts.length < 3) {
        return null
      }

      // Extract project name (everything before the hash)
      // The hash is typically 8 characters, and the last part is the Python version
      // Project name is everything before the last 2 parts (hash and python version)
      const projectName = parts.slice(0, parts.length - 2).join('-')

      if (!projectName) {
        return null
      }

      // Try to get version from the virtualenv
      const version = await this.getPackageVersion(venvPath, projectName)

      return {
        name: projectName,
        version: version || 'unknown',
        location: 'poetry-env',
        manager: 'poetry',
        environment: venvName
      }
    } catch {
      return null
    }
  }

  /**
   * Get package version from virtualenv
   * @param venvPath Path to virtualenv directory
   * @param packageName Package name
   * @returns Package version or null if not found
   */
  private async getPackageVersion(venvPath: string, packageName: string): Promise<string | null> {
    try {
      // Try to read from site-packages
      const platform = os.platform()
      let sitePackagesPath: string

      if (platform === 'win32') {
        sitePackagesPath = path.join(venvPath, 'Lib', 'site-packages')
      } else {
        // Unix-like systems
        // Need to find the Python version directory
        const libPath = path.join(venvPath, 'lib')
        
        try {
          const libEntries = await fs.readdir(libPath)
          const pythonDir = libEntries.find(entry => entry.startsWith('python'))
          
          if (pythonDir) {
            sitePackagesPath = path.join(libPath, pythonDir, 'site-packages')
          } else {
            return null
          }
        } catch {
          return null
        }
      }

      // Look for package metadata
      try {
        const sitePackagesEntries = await fs.readdir(sitePackagesPath)
        const distInfoDir = sitePackagesEntries.find(entry => {
          const normalizedPackageName = packageName.replace(/-/g, '_').toLowerCase()
          const entryLower = entry.toLowerCase()
          return entryLower.startsWith(normalizedPackageName) && entryLower.endsWith('.dist-info')
        })

        if (distInfoDir) {
          // Extract version from directory name
          // Format: packagename-version.dist-info
          const match = distInfoDir.match(/-([^-]+)\.dist-info$/)
          if (match) {
            return match[1]
          }
        }
      } catch {
        return null
      }

      return null
    } catch {
      return null
    }
  }
}
