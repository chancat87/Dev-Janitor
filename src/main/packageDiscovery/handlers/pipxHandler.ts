/**
 * Dev Janitor - Pipx Package Manager Handler
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

/**
 * Pipx JSON output interface
 * Structure: { venvs: { [packageName]: { metadata: { main_package: { package: string, package_version: string } } } } }
 */
interface PipxVenvMetadata {
  main_package: {
    package: string
    package_version: string
  }
}

interface PipxVenv {
  metadata: PipxVenvMetadata
}

interface PipxOutput {
  venvs: {
    [packageName: string]: PipxVenv
  }
}

/**
 * Pipx Package Manager Handler
 * Supports pipx for isolated Python CLI applications
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 7.4
 */
export class PipxHandler implements PackageManagerHandler {
  readonly id = 'pipx' as const
  readonly displayName = 'Pipx'
  readonly executable = 'pipx'
  readonly commonPaths = [
    '~/.local/bin/pipx',
    '/usr/local/bin/pipx',
    // Windows paths
    '%USERPROFILE%\\.local\\bin\\pipx.exe',
    '%LOCALAPPDATA%\\Programs\\Python\\Python*\\Scripts\\pipx.exe'
  ]

  private pathSearch: TieredPathSearch
  private pipxPath: string | null = null

  constructor(pathSearch?: TieredPathSearch) {
    this.pathSearch = pathSearch || new TieredPathSearch(new PathCache())
  }

  /**
   * Check if Pipx is available
   * Validates: Requirements 3.2, 6.1, 6.2, 6.3
   * @returns true if available, false otherwise
   */
  async checkAvailability(): Promise<boolean> {
    const searchResult = await this.pathSearch.findExecutable(
      this.executable,
      this.commonPaths
    )

    if (searchResult) {
      this.pipxPath = searchResult.path
      return true
    }

    return false
  }

  /**
   * List all installed packages
   * Validates: Requirement 3.1
   * @returns Array of package information
   */
  async listPackages(): Promise<PackageInfo[]> {
    const pipxCmd = this.pipxPath || this.executable
    const command = `${pipxCmd} list --json`
    const result = await executeSafe(command)

    if (!result.success || !result.stdout) {
      return []
    }

    return this.parseOutput(result.stdout)
  }

  /**
   * Uninstall a package
   * Validates: Requirement 7.4
   * @param packageName Name of the package to uninstall
   * @param _options Uninstall options (unused for pipx)
   * @returns true if successful, false otherwise
   */
  async uninstallPackage(packageName: string, _options?: UninstallOptions): Promise<boolean> {
    const pipxCmd = this.pipxPath || this.executable
    const command = `${pipxCmd} uninstall ${packageName}`
    
    const result = await executeSafe(command)
    return result.success
  }

  /**
   * Parse command output into PackageInfo array
   * Validates: Requirements 3.3, 3.4, 9.1, 9.2, 9.3
   * @param output Command output string (JSON format)
   * @returns Array of parsed package information
   */
  parseOutput(output: string): PackageInfo[] {
    if (!output || !output.trim()) {
      return []
    }

    try {
      // Try JSON parsing first (Requirement 3.1)
      const data = JSON.parse(output) as PipxOutput
      
      if (!data.venvs || typeof data.venvs !== 'object') {
        return []
      }

      const packages: PackageInfo[] = []

      // Extract packages from venvs structure (Requirement 3.3)
      for (const [venvName, venvData] of Object.entries(data.venvs)) {
        try {
          // Validate venv structure
          if (!venvData?.metadata?.main_package) {
            continue
          }

          const mainPackage = venvData.metadata.main_package
          
          // Validate package data
          if (!mainPackage.package || !mainPackage.package_version) {
            continue
          }

          packages.push({
            name: mainPackage.package,
            version: mainPackage.package_version,
            location: 'pipx-venv',
            manager: 'pipx',
            environment: venvName // Store the venv name
          })
        } catch {
          // Skip malformed venv entries (Requirement 9.2)
          continue
        }
      }

      return packages
    } catch {
      // JSON parsing failed - attempt text-based fallback (Requirement 9.1)
      return this.parseTextFallback(output)
    }
  }

  /**
   * Fallback text parser for non-JSON output
   * Validates: Requirements 9.1, 9.2, 9.3
   * @param output Command output string
   * @returns Array of parsed package information
   */
  private parseTextFallback(output: string): PackageInfo[] {
    const packages: PackageInfo[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Skip empty lines and headers
      if (!trimmedLine || trimmedLine.startsWith('venvs are')) {
        continue
      }

      try {
        // Pipx text format typically shows: "   package package_version"
        // or "package package_version" with various indentation
        const match = trimmedLine.match(/^\s*(\S+)\s+(\S+)/)
        
        if (!match) {
          // Malformed line - skip it (Requirement 9.2)
          continue
        }

        const name = match[1]
        const version = match[2]

        // Validate that we have non-empty name and version
        if (!name || !version) {
          continue
        }

        packages.push({
          name,
          version,
          location: 'pipx-venv',
          manager: 'pipx'
        })
      } catch {
        // Skip malformed lines (Requirement 9.2)
        continue
      }
    }

    return packages
  }
}
