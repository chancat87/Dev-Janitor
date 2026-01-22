/**
 * Dev Janitor - Conda Package Manager Handler
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
 * Conda JSON output interface
 */
interface CondaPackage {
  name: string
  version: string
  channel?: string
  build_string?: string
  platform?: string
}

/**
 * Conda Package Manager Handler
 * Supports conda package management for scientific computing
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 7.3
 */
export class CondaHandler implements PackageManagerHandler {
  readonly id = 'conda' as const
  readonly displayName = 'Conda'
  readonly executable = 'conda'
  readonly commonPaths = [
    '~/anaconda3/bin/conda',
    '~/miniconda3/bin/conda',
    '/opt/anaconda3/bin/conda',
    '/opt/miniconda3/bin/conda',
    '~/.conda/bin/conda',
    // Windows paths
    '%USERPROFILE%\\anaconda3\\Scripts\\conda.exe',
    '%USERPROFILE%\\miniconda3\\Scripts\\conda.exe'
  ]

  private pathSearch: TieredPathSearch
  private condaPath: string | null = null

  constructor(pathSearch?: TieredPathSearch) {
    this.pathSearch = pathSearch || new TieredPathSearch(new PathCache())
  }

  /**
   * Check if Conda is available
   * Validates: Requirements 2.2, 6.1, 6.2, 6.3
   * @returns true if available, false otherwise
   */
  async checkAvailability(): Promise<boolean> {
    const searchResult = await this.pathSearch.findExecutable(
      this.executable,
      this.commonPaths
    )

    if (searchResult) {
      this.condaPath = searchResult.path
      return true
    }

    return false
  }

  /**
   * List all installed packages
   * Validates: Requirement 2.1
   * @returns Array of package information
   */
  async listPackages(): Promise<PackageInfo[]> {
    const condaCmd = this.condaPath || this.executable
    const command = `${condaCmd} list --json`
    const result = await executeSafe(command)

    if (!result.success || !result.stdout) {
      return []
    }

    return this.parseOutput(result.stdout)
  }

  /**
   * Uninstall a package
   * Validates: Requirement 7.3
   * @param packageName Name of the package to uninstall
   * @param _options Uninstall options (unused for conda)
   * @returns true if successful, false otherwise
   */
  async uninstallPackage(packageName: string, _options?: UninstallOptions): Promise<boolean> {
    const condaCmd = this.condaPath || this.executable
    const command = `${condaCmd} remove -y ${packageName}`
    
    const result = await executeSafe(command)
    return result.success
  }

  /**
   * Parse command output into PackageInfo array
   * Validates: Requirements 2.3, 2.4, 9.1, 9.2, 9.3
   * @param output Command output string (JSON format)
   * @returns Array of parsed package information
   */
  parseOutput(output: string): PackageInfo[] {
    if (!output || !output.trim()) {
      return []
    }

    try {
      // Try JSON parsing first (Requirement 2.1)
      const packages = JSON.parse(output) as CondaPackage[]
      
      if (!Array.isArray(packages)) {
        return []
      }

      return packages
        .filter(pkg => pkg.name && pkg.version) // Filter out invalid entries
        .map(pkg => ({
          name: pkg.name,
          version: pkg.version,
          location: 'conda-env',
          manager: 'conda',
          channel: pkg.channel // Extract channel (Requirement 2.3)
        }))
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
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue
      }

      try {
        // Conda text format: "package_name version build channel"
        // Example: "numpy 1.24.3 py311h08b1b3b_0 defaults"
        const parts = trimmedLine.split(/\s+/)
        
        if (parts.length < 2) {
          // Malformed line - skip it (Requirement 9.2)
          continue
        }

        const name = parts[0]
        const version = parts[1]
        const channel = parts.length >= 4 ? parts[3] : undefined

        // Validate that we have non-empty name and version
        if (!name || !version) {
          continue
        }

        packages.push({
          name,
          version,
          location: 'conda-env',
          manager: 'conda',
          channel
        })
      } catch {
        // Skip malformed lines (Requirement 9.2)
        continue
      }
    }

    return packages
  }
}
