/**
 * Dev Janitor - Package Discovery Handler Types
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

import { PackageInfo, PackageManagerType } from '../../shared/types'

/**
 * Package Manager Handler Interface
 * Each package manager implements this interface
 * Validates: Requirements 6.1, 6.2, 6.3
 */
export interface PackageManagerHandler {
  /** Package manager identifier */
  readonly id: PackageManagerType
  
  /** Display name */
  readonly displayName: string
  
  /** Executable file name */
  readonly executable: string
  
  /** Common installation paths */
  readonly commonPaths: string[]
  
  /**
   * Check if package manager is available
   * Validates: Requirements 6.1, 6.2, 6.3
   * @returns true if available, false otherwise
   */
  checkAvailability(): Promise<boolean>
  
  /**
   * List installed packages
   * Validates: Requirements 1.1, 1.2, 2.1, 3.1, 5.1
   * @returns Array of package information
   */
  listPackages(): Promise<PackageInfo[]>
  
  /**
   * Uninstall a package
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
   * @param packageName Name of the package to uninstall
   * @param options Additional options (e.g., cask for Homebrew)
   * @returns true if successful, false otherwise
   */
  uninstallPackage(packageName: string, options?: UninstallOptions): Promise<boolean>
  
  /**
   * Parse command output into PackageInfo array
   * Validates: Requirements 1.4, 1.5, 2.3, 2.4, 3.3, 3.4, 4.3, 5.3, 5.4
   * @param output Command output string
   * @returns Array of parsed package information
   */
  parseOutput(output: string): PackageInfo[]
}

/**
 * Uninstall options for package managers
 */
export interface UninstallOptions {
  /** For Homebrew: whether this is a cask package */
  cask?: boolean
  /** Force uninstall */
  force?: boolean
  /** Additional flags */
  flags?: string[]
}

/**
 * Package manager command configuration
 */
export interface PackageManagerCommands {
  /** Command to check version/availability */
  version: string
  /** Command to list packages */
  list: string
  /** Command to uninstall a package */
  uninstall: (packageName: string, options?: UninstallOptions) => string
}
