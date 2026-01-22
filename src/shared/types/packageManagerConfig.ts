/**
 * Dev Janitor - Package Manager Configuration Types
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

import { PackageManagerType } from './index'

/**
 * Package manager availability status
 * Validates: Requirement 14.1, 14.2, 14.3
 */
export type ManagerAvailabilityStatus = 
  | 'available'      // In PATH and directly usable
  | 'path_missing'   // Installed but not in PATH
  | 'not_installed'  // Not installed

/**
 * Discovery method for package managers
 * Validates: Requirement 14.4
 */
export type DiscoveryMethod = 
  | 'direct_command'  // Tier 1: Direct command succeeded
  | 'path_scan'       // Tier 2: Found via PATH scan
  | 'common_path'     // Tier 3: Found via common paths
  | 'custom_path'     // Tier 4: Found via custom config

/**
 * Package manager status information
 * Validates: Requirements 14.1, 14.2, 14.3, 14.4
 */
export interface PackageManagerStatus {
  manager: PackageManagerType
  status: ManagerAvailabilityStatus
  discoveryMethod?: DiscoveryMethod
  foundPath?: string
  inPath: boolean  // Whether it's in PATH environment variable
  message?: string // Status message (e.g., PATH configuration suggestion)
}

/**
 * User configuration file format
 * Location: ~/.config/dev-janitor/package-managers.json
 * Validates: Requirements 11.1, 11.3
 */
export interface PackageManagerConfig {
  customPaths?: {
    brew?: string[]
    conda?: string[]
    pipx?: string[]
    poetry?: string[]
    pyenv?: string[]
    npm?: string[]
    pip?: string[]
    composer?: string[]
    cargo?: string[]
    gem?: string[]
    [key: string]: string[] | undefined  // Allow dynamic keys for testing
  }
  disabled?: PackageManagerType[]  // Disabled package managers
  timeout?: number                  // Custom timeout in milliseconds
}

/**
 * Search result from tiered path search
 * Validates: Requirements 10.6, 13.4
 */
export interface SearchResult {
  path: string
  method: DiscoveryMethod
  inPath: boolean  // Whether found in PATH
}
