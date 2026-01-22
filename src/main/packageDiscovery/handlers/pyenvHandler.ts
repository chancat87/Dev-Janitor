/**
 * Dev Janitor - Pyenv Package Manager Handler
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
 * Pyenv Package Manager Handler
 * Manages Python versions installed via Pyenv
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 7.5
 */
export class PyenvHandler implements PackageManagerHandler {
  readonly id = 'pyenv' as const
  readonly displayName = 'Pyenv'
  readonly executable = 'pyenv'
  readonly commonPaths = [
    '~/.pyenv/bin/pyenv',
    '/opt/pyenv/bin/pyenv',
    '/usr/local/bin/pyenv'
  ]

  private pathSearch: TieredPathSearch
  private pyenvPath: string | null = null

  constructor(pathSearch?: TieredPathSearch) {
    this.pathSearch = pathSearch || new TieredPathSearch(new PathCache())
  }

  /**
   * Check if Pyenv is available
   * Validates: Requirements 5.2, 6.1, 6.2, 6.3
   * @returns true if available, false otherwise
   */
  async checkAvailability(): Promise<boolean> {
    const searchResult = await this.pathSearch.findExecutable(
      this.executable,
      this.commonPaths
    )

    if (searchResult) {
      this.pyenvPath = searchResult.path
      return true
    }

    return false
  }

  /**
   * List all installed Python versions
   * Validates: Requirement 5.1
   * @returns Array of package information
   */
  async listPackages(): Promise<PackageInfo[]> {
    const pyenvCmd = this.pyenvPath || this.executable
    const command = `${pyenvCmd} versions --bare`
    const result = await executeSafe(command)

    if (!result.success || !result.stdout) {
      return []
    }

    return this.parseOutput(result.stdout)
  }

  /**
   * Uninstall a Python version
   * Validates: Requirement 7.5
   * @param packageName Python version to uninstall
   * @param _options Uninstall options (unused for pyenv)
   * @returns true if successful, false otherwise
   */
  async uninstallPackage(packageName: string, _options?: UninstallOptions): Promise<boolean> {
    const pyenvCmd = this.pyenvPath || this.executable
    const command = `${pyenvCmd} uninstall -f ${packageName}`
    
    const result = await executeSafe(command)
    return result.success
  }

  /**
   * Parse command output into PackageInfo array
   * Validates: Requirements 5.3, 5.4, 9.1, 9.2, 9.3
   * @param output Command output string
   * @returns Array of parsed package information
   */
  parseOutput(output: string): PackageInfo[] {
    if (!output || !output.trim()) {
      return []
    }

    const packages: PackageInfo[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Skip empty lines
      if (!trimmedLine) {
        continue
      }

      try {
        // Pyenv output format: one version per line
        // Examples: "3.11.4", "3.10.12", "2.7.18", "pypy3.9-7.3.11"
        const version = trimmedLine

        // Validate that we have a non-empty version
        if (!version) {
          continue
        }

        // Each Python version is treated as a package with name 'python'
        // The version string becomes the version field
        packages.push({
          name: 'python',
          version,
          location: 'pyenv-version',
          manager: 'pyenv'
        })
      } catch {
        // Skip malformed lines (Requirement 9.2)
        continue
      }
    }

    return packages
  }
}
