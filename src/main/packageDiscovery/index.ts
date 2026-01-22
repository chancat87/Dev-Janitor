/**
 * Dev Janitor - Package Discovery Module
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

/**
 * Package Discovery Module Export Index
 * 
 * This module provides enhanced package manager discovery capabilities
 * for Dev Janitor, including support for:
 * - Homebrew (brew)
 * - Conda
 * - Pipx
 * - Poetry
 * - Pyenv
 * 
 * Features:
 * - Tiered path search strategy (command → PATH → common paths → custom config)
 * - Session-level path caching
 * - Parallel availability detection
 * - PATH configuration status detection
 * - Graceful error handling
 */

// Main classes
export { PackageDiscovery } from './packageDiscovery'
export type { ProgressCallback } from './packageDiscovery'

// Infrastructure
export { PathCache } from './pathCache'
export { TieredPathSearch } from './tieredPathSearch'

// Types
export type { PackageManagerHandler } from './types'

// Handlers
export { BrewHandler } from './handlers/brewHandler'
export { CondaHandler } from './handlers/condaHandler'
export { PipxHandler } from './handlers/pipxHandler'
export { PoetryHandler } from './handlers/poetryHandler'
export { PyenvHandler } from './handlers/pyenvHandler'

// Import for default export
import { PackageDiscovery } from './packageDiscovery'
import { PathCache } from './pathCache'
import { TieredPathSearch } from './tieredPathSearch'

/**
 * Create a default PackageDiscovery instance
 * @returns A new PackageDiscovery instance
 */
export function createPackageDiscovery(): PackageDiscovery {
  return new PackageDiscovery()
}

// Default export
export default {
  PackageDiscovery,
  PathCache,
  TieredPathSearch,
  createPackageDiscovery,
}
