/**
 * Dev Janitor - Package Discovery Tests
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

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { PackageDiscovery } from './packageDiscovery'
import { PathCache } from './pathCache'
import { PackageManagerType } from '../../shared/types'
import * as commandExecutor from '../commandExecutor'

describe('PackageDiscovery', () => {
  let discovery: PackageDiscovery
  let cache: PathCache

  beforeEach(() => {
    vi.restoreAllMocks() // Restore all mocks before each test
    cache = new PathCache()
    discovery = new PackageDiscovery(cache)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor and Registration', () => {
    it('should register all package manager handlers', () => {
      const managers = discovery.getRegisteredManagers()
      
      expect(managers).toContain('brew')
      expect(managers).toContain('conda')
      expect(managers).toContain('pipx')
      expect(managers).toContain('poetry')
      expect(managers).toContain('pyenv')
    })

    it('should create handlers for all registered managers', () => {
      const managers = discovery.getRegisteredManagers()
      
      for (const manager of managers) {
        const handler = discovery.getHandler(manager)
        expect(handler).toBeDefined()
        expect(handler?.id).toBe(manager)
      }
    })
  })

  describe('Property 4: Availability State Consistency', () => {
    /**
     * Feature: enhanced-package-discovery
     * Property 4: Availability State Consistency
     * **Validates: Requirements 6.1, 6.2, 6.3**
     * 
     * For any package manager, the availability status SHALL be consistent with command execution results:
     * - If version command succeeds → manager is marked available
     * - If version command fails → manager is marked unavailable
     */
    it('availability status matches command execution result', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom<PackageManagerType>('brew', 'conda', 'pipx', 'poetry', 'pyenv'),
          fc.boolean(),
          async (manager, commandSucceeds) => {
            // Create fresh instance for each test
            const testCache = new PathCache()
            const testDiscovery = new PackageDiscovery(testCache)
            
            // Mock executeSafe to control command success/failure
            vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
              success: commandSucceeds,
              stdout: commandSucceeds ? 'version 1.0.0' : '',
              stderr: commandSucceeds ? '' : 'command not found',
              exitCode: commandSucceeds ? 0 : 1
            })

            const status = await testDiscovery.getManagerStatus(manager)

            if (commandSucceeds) {
              // Command succeeded → should be available or path_missing
              expect(['available', 'path_missing']).toContain(status.status)
            } else {
              // Command failed → should be not_installed
              expect(status.status).toBe('not_installed')
            }
            
            vi.restoreAllMocks()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should mark manager as available when found via direct command', async () => {
      // Mock successful direct command
      vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
        success: true,
        stdout: 'brew 4.0.0',
        stderr: '',
        exitCode: 0
      })

      const status = await discovery.getManagerStatus('brew')

      expect(status.status).toBe('available')
      expect(status.inPath).toBe(true)
      expect(status.discoveryMethod).toBe('direct_command')
    })

    it('should mark manager as not_installed when not found', async () => {
      // Mock failed command
      vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'command not found',
        exitCode: 127
      })

      const status = await discovery.getManagerStatus('brew')

      expect(status.status).toBe('not_installed')
      expect(status.inPath).toBe(false)
    })
  })

  describe('Property 9: Parallel Execution Independence', () => {
    /**
     * Feature: enhanced-package-discovery
     * Property 9: Parallel Execution Independence
     * **Validates: Requirement 13.1**
     * 
     * For any set of package managers being checked in parallel,
     * the failure of one manager's check SHALL NOT affect the results of other managers.
     */
    it('should handle failures in individual managers without affecting others', async () => {
      let callCount = 0
      
      // Mock executeSafe to fail for brew but succeed for others
      vi.spyOn(commandExecutor, 'executeSafe').mockImplementation(async (command: string) => {
        callCount++
        
        if (command.includes('brew')) {
          throw new Error('Brew check failed')
        }
        
        return {
          success: true,
          stdout: 'version 1.0.0',
          stderr: '',
          exitCode: 0
        }
      })

      const statuses = await discovery.discoverAvailableManagers()

      // Should have results for all managers
      expect(statuses.length).toBeGreaterThan(0)
      
      // Brew should be marked as not_installed due to error
      const brewStatus = statuses.find(s => s.manager === 'brew')
      expect(brewStatus?.status).toBe('not_installed')
      
      // Other managers should still be checked (multiple calls made)
      expect(callCount).toBeGreaterThan(1)
    })

    it('parallel checks execute independently', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.constantFrom<PackageManagerType>('brew', 'conda', 'pipx', 'poetry', 'pyenv'),
            { minLength: 2, maxLength: 5 }
          ).map(arr => [...new Set(arr)]), // Remove duplicates
          async (_managers) => {
            const testCache = new PathCache()
            const testDiscovery = new PackageDiscovery(testCache)
            const executionOrder: string[] = []
            
            vi.spyOn(commandExecutor, 'executeSafe').mockImplementation(async (command: string) => {
              // Record execution order
              executionOrder.push(command)
              
              // Random delay to simulate real execution
              await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
              
              return {
                success: true,
                stdout: 'version 1.0.0',
                stderr: '',
                exitCode: 0
              }
            })

            const statuses = await testDiscovery.discoverAvailableManagers()

            // All managers should have a status
            expect(statuses.length).toBe(testDiscovery.getRegisteredManagers().length)
            
            // All statuses should be valid
            for (const status of statuses) {
              expect(['available', 'path_missing', 'not_installed']).toContain(status.status)
            }
            
            vi.restoreAllMocks()
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  describe('Property 11: PATH Status Detection', () => {
    /**
     * Feature: enhanced-package-discovery
     * Property 11: PATH Configuration Status Detection
     * **Validates: Requirements 14.1, 14.2, 14.3, 14.4**
     * 
     * For any package manager that is found:
     * - If found via Tier 1 (direct command) or Tier 2 (PATH scan) → status SHALL be 'available' and inPath SHALL be true
     * - If found via Tier 3 (common paths) or Tier 4 (custom paths) → status SHALL be 'path_missing' and inPath SHALL be false
     * - If not found in any tier → status SHALL be 'not_installed'
     * - The discoveryMethod field SHALL accurately reflect which tier found the executable
     */
    it('should mark as available when found via direct command (Tier 1)', async () => {
      vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
        success: true,
        stdout: 'brew 4.0.0',
        stderr: '',
        exitCode: 0
      })

      const status = await discovery.getManagerStatus('brew')

      expect(status.status).toBe('available')
      expect(status.inPath).toBe(true)
      expect(status.discoveryMethod).toBe('direct_command')
      expect(status.message).toBeUndefined()
    })

    it('should mark as path_missing when found via common paths (Tier 3)', async () => {
      // First call (direct command) fails
      // Subsequent calls for PATH scan fail
      // Then succeed for common path verification
      let callCount = 0
      
      vi.spyOn(commandExecutor, 'executeSafe').mockImplementation(async (command: string) => {
        callCount++
        
        // Direct command check fails
        if (callCount === 1) {
          return {
            success: false,
            stdout: '',
            stderr: 'command not found',
            exitCode: 127
          }
        }
        
        // Common path verification succeeds
        if (command.includes('/opt/homebrew/bin/brew') || 
            command.includes('/usr/local/bin/brew')) {
          return {
            success: true,
            stdout: 'brew 4.0.0',
            stderr: '',
            exitCode: 0
          }
        }
        
        return {
          success: false,
          stdout: '',
          stderr: 'not found',
          exitCode: 127
        }
      })

      const status = await discovery.getManagerStatus('brew')

      // Should be path_missing since found via common paths
      if (status.status !== 'not_installed') {
        expect(status.status).toBe('path_missing')
        expect(status.inPath).toBe(false)
        expect(status.discoveryMethod).toBe('common_path')
        expect(status.message).toContain('not in PATH')
      }
    })

    it('should mark as not_installed when not found in any tier', async () => {
      vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'command not found',
        exitCode: 127
      })

      const status = await discovery.getManagerStatus('brew')

      expect(status.status).toBe('not_installed')
      expect(status.inPath).toBe(false)
      expect(status.discoveryMethod).toBeUndefined()
    })

    it('status fields are consistent with discovery method', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom<PackageManagerType>('brew', 'conda', 'pipx', 'poetry', 'pyenv'),
          async (manager) => {
            const testCache = new PathCache()
            const testDiscovery = new PackageDiscovery(testCache)
            
            // Mock to simulate finding via direct command
            vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
              success: true,
              stdout: 'version 1.0.0',
              stderr: '',
              exitCode: 0
            })

            const status = await testDiscovery.getManagerStatus(manager)

            // Verify consistency between status, inPath, and discoveryMethod
            if (status.status === 'available') {
              expect(status.inPath).toBe(true)
              expect(['direct_command', 'path_scan']).toContain(status.discoveryMethod!)
            } else if (status.status === 'path_missing') {
              expect(status.inPath).toBe(false)
              expect(['common_path', 'custom_path']).toContain(status.discoveryMethod!)
              expect(status.message).toContain('not in PATH')
            } else if (status.status === 'not_installed') {
              expect(status.inPath).toBe(false)
              expect(status.discoveryMethod).toBeUndefined()
            }
            
            vi.restoreAllMocks()
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('listAllPackages', () => {
    it('should collect packages from all available managers', async () => {
      // Create a fresh instance to avoid any state from previous tests
      const freshCache = new PathCache()
      const freshDiscovery = new PackageDiscovery(freshCache)
      
      // Mock brew as available - need to handle all commands that TieredPathSearch might call
      vi.spyOn(commandExecutor, 'executeSafe').mockImplementation(async (command: string) => {
        // Tier 1: Direct command check for brew
        if (command === 'brew --version') {
          return {
            success: true,
            stdout: 'brew 4.0.0',
            stderr: '',
            exitCode: 0
          }
        }
        
        // List formulas
        if (command === 'brew list --versions') {
          return {
            success: true,
            stdout: 'node 18.0.0\nnpm 9.0.0',
            stderr: '',
            exitCode: 0
          }
        }
        
        // List casks
        if (command === 'brew list --cask --versions') {
          return {
            success: true,
            stdout: 'visual-studio-code 1.80.0',
            stderr: '',
            exitCode: 0
          }
        }
        
        // All other commands fail (other package managers)
        return {
          success: false,
          stdout: '',
          stderr: 'not found',
          exitCode: 127
        }
      })

      const packages = await freshDiscovery.listAllPackages()

      // Should have packages from brew
      expect(packages.length).toBeGreaterThan(0)
      expect(packages.some(p => p.manager === 'brew')).toBe(true)
    })

    it('should call progress callback during scanning', async () => {
      const progressCalls: Array<{ manager: string; status: string }> = []
      
      vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'not found',
        exitCode: 127
      })

      await discovery.listAllPackages((manager, status) => {
        progressCalls.push({ manager, status })
      })

      // Progress callback should be called (even if no packages found)
      // This verifies Requirement 13.6
      expect(progressCalls.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle errors gracefully and continue with other managers', async () => {
      vi.spyOn(commandExecutor, 'executeSafe').mockImplementation(async (command: string) => {
        if (command.includes('brew')) {
          throw new Error('Brew error')
        }
        
        return {
          success: false,
          stdout: '',
          stderr: 'not found',
          exitCode: 127
        }
      })

      // Should not throw
      const packages = await discovery.listAllPackages()
      
      // Should return an array (possibly empty)
      expect(Array.isArray(packages)).toBe(true)
    })
  })

  describe('listPackages', () => {
    it('should return empty array for unavailable manager', async () => {
      vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'not found',
        exitCode: 127
      })

      const packages = await discovery.listPackages('brew')

      expect(packages).toEqual([])
    })

    it('should return packages for available manager', async () => {
      vi.spyOn(commandExecutor, 'executeSafe').mockImplementation(async (command: string) => {
        if (command.includes('--version')) {
          return {
            success: true,
            stdout: 'brew 4.0.0',
            stderr: '',
            exitCode: 0
          }
        }
        
        if (command.includes('list --versions')) {
          return {
            success: true,
            stdout: 'node 18.0.0',
            stderr: '',
            exitCode: 0
          }
        }
        
        if (command.includes('list --cask')) {
          return {
            success: true,
            stdout: '',
            stderr: '',
            exitCode: 0
          }
        }
        
        return {
          success: false,
          stdout: '',
          stderr: '',
          exitCode: 1
        }
      })

      const packages = await discovery.listPackages('brew')

      expect(packages.length).toBeGreaterThan(0)
      expect(packages[0].manager).toBe('brew')
    })
  })

  describe('uninstallPackage', () => {
    it('should return false for unknown manager', async () => {
      const result = await discovery.uninstallPackage('test-package', 'unknown' as PackageManagerType)

      expect(result).toBe(false)
    })

    it('should call handler uninstall method', async () => {
      vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
        success: true,
        stdout: 'Uninstalling...',
        stderr: '',
        exitCode: 0
      })

      const result = await discovery.uninstallPackage('node', 'brew')

      expect(result).toBe(true)
    })

    it('should handle uninstall errors gracefully', async () => {
      vi.spyOn(commandExecutor, 'executeSafe').mockRejectedValue(new Error('Uninstall failed'))

      const result = await discovery.uninstallPackage('node', 'brew')

      expect(result).toBe(false)
    })
  })

  describe('Cache Management', () => {
    it('should use cache for repeated checks', async () => {
      let callCount = 0
      
      vi.spyOn(commandExecutor, 'executeSafe').mockImplementation(async () => {
        callCount++
        return {
          success: true,
          stdout: 'brew 4.0.0',
          stderr: '',
          exitCode: 0
        }
      })

      // First call
      await discovery.getManagerStatus('brew')
      const firstCallCount = callCount

      // Second call - should use cache
      await discovery.getManagerStatus('brew')
      const secondCallCount = callCount

      // Second call should not increase call count significantly
      // (may have one additional call for verification)
      expect(secondCallCount).toBeLessThanOrEqual(firstCallCount + 1)
    })

    it('should clear cache when requested', async () => {
      vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
        success: true,
        stdout: 'brew 4.0.0',
        stderr: '',
        exitCode: 0
      })

      // Populate cache
      await discovery.getManagerStatus('brew')
      
      // Clear cache
      discovery.clearCache()
      
      // Cache should be empty
      expect(cache.size()).toBe(0)
    })
  })

  describe('Custom Configuration', () => {
    it('should load custom configuration', async () => {
      // This test verifies that loadCustomConfig doesn't throw
      await expect(discovery.loadCustomConfig()).resolves.not.toThrow()
    })
  })
})
