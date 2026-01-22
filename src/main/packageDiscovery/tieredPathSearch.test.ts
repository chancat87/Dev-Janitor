/**
 * Tests for TieredPathSearch
 * 
 * Feature: enhanced-package-discovery
 * Tests Property 7: Tiered Search Order
 * Validates: Requirements 10.1, 10.6, 13.3, 13.4
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import fc from 'fast-check'
import { TieredPathSearch } from './tieredPathSearch'
import { PathCache } from './pathCache'
import { PackageManagerConfig } from '../../shared/types/packageManagerConfig'
import * as commandExecutor from '../commandExecutor'
import { promises as fs } from 'fs'

// Mock the commandExecutor module
vi.mock('../commandExecutor', async () => {
  const actual = await vi.importActual('../commandExecutor')
  return {
    ...actual,
    executeSafe: vi.fn(),
  }
})

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn(),
    readFile: vi.fn(),
  },
}))

describe('TieredPathSearch', () => {
  let cache: PathCache
  let search: TieredPathSearch
  const mockExecuteSafe = vi.mocked(commandExecutor.executeSafe)
  const mockStat = vi.mocked(fs.stat)

  beforeEach(() => {
    cache = new PathCache()
    search = new TieredPathSearch(cache)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Operations', () => {
    it('should return null when executable is not found', async () => {
      // Mock all tiers to fail
      mockExecuteSafe.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'command not found',
        exitCode: 1,
      })

      mockStat.mockRejectedValue(new Error('ENOENT'))

      const result = await search.findExecutable('nonexistent', [])
      expect(result).toBeNull()
    })

    it('should cache negative results', async () => {
      mockExecuteSafe.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'command not found',
        exitCode: 1,
      })

      mockStat.mockRejectedValue(new Error('ENOENT'))

      // First search
      await search.findExecutable('nonexistent', [])
      
      // Check cache
      expect(cache.getPath('nonexistent')).toBeNull()
    })

    it('should return cached result on subsequent calls', async () => {
      // Set up cache
      cache.setPath('npm', '/usr/local/bin/npm')

      const result = await search.findExecutable('npm', [])
      
      // Should return cached result without calling executeSafe
      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/local/bin/npm')
      expect(mockExecuteSafe).not.toHaveBeenCalled()
    })
  })

  describe('Tier 1: Direct Command Check', () => {
    it('should find executable via direct command', async () => {
      mockExecuteSafe.mockResolvedValue({
        success: true,
        stdout: 'npm 8.0.0',
        stderr: '',
        exitCode: 0,
      })

      const result = await search.findExecutable('npm', [])
      
      expect(result).not.toBeNull()
      expect(result?.path).toBe('npm')
      expect(result?.method).toBe('direct_command')
      expect(result?.inPath).toBe(true)
      expect(mockExecuteSafe).toHaveBeenCalledWith('npm --version')
    })

    it('should cache result from direct command', async () => {
      mockExecuteSafe.mockResolvedValue({
        success: true,
        stdout: 'npm 8.0.0',
        stderr: '',
        exitCode: 0,
      })

      await search.findExecutable('npm', [])
      
      expect(cache.getPath('npm')).toBe('npm')
    })
  })

  describe('Tier 2: PATH Environment Scan', () => {
    it('should scan PATH when direct command fails', async () => {
      // Direct command fails
      mockExecuteSafe
        .mockResolvedValueOnce({
          success: false,
          stdout: '',
          stderr: 'command not found',
          exitCode: 1,
        })
        // Verification succeeds
        .mockResolvedValueOnce({
          success: true,
          stdout: 'npm 8.0.0',
          stderr: '',
          exitCode: 0,
        })

      // Mock file exists in PATH
      mockStat.mockResolvedValue({
        isFile: () => true,
      } as any)

      // Set up PATH environment
      const originalPath = process.env.PATH
      process.env.PATH = '/usr/local/bin:/usr/bin'

      const result = await search.findExecutable('npm', [])
      
      expect(result).not.toBeNull()
      expect(result?.method).toBe('path_scan')
      expect(result?.inPath).toBe(true)

      // Restore PATH
      process.env.PATH = originalPath
    })
  })

  describe('Tier 3: Common Paths Search', () => {
    it('should search common paths when PATH scan fails', async () => {
      // Save original PATH
      const originalPath = process.env.PATH
      // Set empty PATH to skip tier 2
      process.env.PATH = ''

      // Direct command fails
      mockExecuteSafe
        .mockResolvedValueOnce({
          success: false,
          stdout: '',
          stderr: 'command not found',
          exitCode: 1,
        })
        // Verification succeeds
        .mockResolvedValueOnce({
          success: true,
          stdout: 'brew 3.0.0',
          stderr: '',
          exitCode: 0,
        })

      // Mock file exists in common path
      mockStat.mockResolvedValueOnce({
        isFile: () => true,
      } as any)

      const result = await search.findExecutable('brew', ['/opt/homebrew/bin/brew'])
      
      // Restore PATH
      process.env.PATH = originalPath

      expect(result).not.toBeNull()
      expect(result?.method).toBe('common_path')
      expect(result?.inPath).toBe(false)
    })

    it('should expand ~ in common paths', async () => {
      // Save original PATH
      const originalPath = process.env.PATH
      // Set empty PATH to skip tier 2
      process.env.PATH = ''

      mockExecuteSafe
        .mockResolvedValueOnce({
          success: false,
          stdout: '',
          stderr: 'command not found',
          exitCode: 1,
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'pyenv 2.0.0',
          stderr: '',
          exitCode: 0,
        })

      mockStat.mockResolvedValueOnce({
        isFile: () => true,
      } as any)

      const result = await search.findExecutable('pyenv', ['~/.pyenv/bin/pyenv'])
      
      // Restore PATH
      process.env.PATH = originalPath

      expect(result).not.toBeNull()
      expect(result?.path).toContain('.pyenv')
      expect(result?.path).not.toContain('~')
    })
  })

  describe('Tier 4: Custom Config Paths', () => {
    it('should search custom paths when common paths fail', async () => {
      // Save original PATH
      const originalPath = process.env.PATH
      // Set empty PATH to skip tier 2
      process.env.PATH = ''

      const customConfig: PackageManagerConfig = {
        customPaths: {
          brew: ['/custom/path/to/brew'],
        },
      }

      search.setCustomConfig(customConfig)

      mockExecuteSafe
        .mockResolvedValueOnce({
          success: false,
          stdout: '',
          stderr: 'command not found',
          exitCode: 1,
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'brew 3.0.0',
          stderr: '',
          exitCode: 0,
        })

      mockStat
        .mockRejectedValueOnce(new Error('ENOENT')) // Common path fails
        .mockResolvedValueOnce({
          isFile: () => true,
        } as any)

      const result = await search.findExecutable('brew', ['/opt/homebrew/bin/brew'])
      
      // Restore PATH
      process.env.PATH = originalPath

      expect(result).not.toBeNull()
      expect(result?.method).toBe('custom_path')
      expect(result?.inPath).toBe(false)
      expect(result?.path).toBe('/custom/path/to/brew')
    })

    it('should prioritize custom paths over common paths', async () => {
      // Save original PATH
      const originalPath = process.env.PATH
      // Set empty PATH to skip tier 2
      process.env.PATH = ''

      const customConfig: PackageManagerConfig = {
        customPaths: {
          npm: ['/custom/npm'],
        },
      }

      search.setCustomConfig(customConfig)

      mockExecuteSafe
        .mockResolvedValueOnce({
          success: false,
          stdout: '',
          stderr: 'command not found',
          exitCode: 1,
        })
        .mockResolvedValueOnce({
          success: true,
          stdout: 'npm 8.0.0',
          stderr: '',
          exitCode: 0,
        })

      mockStat
        .mockRejectedValueOnce(new Error('ENOENT')) // Common path fails
        .mockResolvedValueOnce({
          isFile: () => true,
        } as any)

      const result = await search.findExecutable('npm', ['/usr/local/bin/npm'])
      
      // Restore PATH
      process.env.PATH = originalPath

      expect(result).not.toBeNull()
      expect(result?.method).toBe('custom_path')
    })
  })

  describe('Property 7: Tiered Search Order', () => {
    /**
     * Feature: enhanced-package-discovery
     * Property 7: Tiered Search Order
     * **Validates: Requirements 10.1, 10.6, 13.3, 13.4**
     * 
     * For any package manager search, the tiers SHALL be executed in order:
     * 1. Direct command check (fastest)
     * 2. PATH environment scan
     * 3. Common paths search
     * 4. Custom config paths
     * 
     * And search SHALL terminate early when a valid executable is found.
     */
    it('Property 7: should execute tiers in order and terminate early', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            executable: fc.constantFrom('testexec1', 'testexec2', 'testexec3', 'testexec4', 'testexec5'),
            successTier: fc.integer({ min: 1, max: 4 }),
          }),
          async ({ executable, successTier }) => {
            // Save original PATH
            const originalPath = process.env.PATH
            
            const testCache = new PathCache()
            const testSearch = new TieredPathSearch(testCache)
            
            // Track execution order
            const executionLog: string[] = []

            // Set PATH based on successTier
            // For tier 1, PATH doesn't matter (direct command)
            // For tier 2, need PATH with directories
            // For tier 3+, empty PATH to skip tier 2
            if (successTier === 1) {
              process.env.PATH = ''
            } else if (successTier === 2) {
              process.env.PATH = '/test/path/bin'
            } else {
              process.env.PATH = ''
            }

            // Mock executeSafe
            mockExecuteSafe.mockImplementation(async (cmd: string) => {
              executionLog.push(`executeSafe: ${cmd}`)
              
              // Tier 1: direct command check
              if (cmd === `${executable} --version`) {
                if (successTier === 1) {
                  return { success: true, stdout: 'version 1.0', stderr: '', exitCode: 0 }
                }
                return { success: false, stdout: '', stderr: 'not found', exitCode: 1 }
              }
              
              // Verification calls (tiers 2, 3, 4)
              if (cmd.includes('--version')) {
                return { success: true, stdout: 'version 1.0', stderr: '', exitCode: 0 }
              }
              
              return { success: false, stdout: '', stderr: 'not found', exitCode: 1 }
            })

            // Mock stat
            let statCallCount = 0
            mockStat.mockImplementation(async (filePath) => {
              statCallCount++
              executionLog.push(`stat: ${filePath} (call ${statCallCount})`)
              
              // Normalize path for comparison (handle Windows backslashes)
              const normalizedPath = String(filePath).replace(/\\/g, '/')
              
              // For tier 2: PATH scan - succeed for path in PATH
              if (successTier === 2 && normalizedPath.includes('/test/path/bin')) {
                return { isFile: () => true } as any
              }
              
              // For tier 3: common path - succeed for common path
              if (successTier === 3 && normalizedPath.includes('/common/path')) {
                return { isFile: () => true } as any
              }
              
              // For tier 4: custom path - succeed for custom path
              if (successTier === 4 && normalizedPath.includes('/custom/path')) {
                return { isFile: () => true } as any
              }
              
              throw new Error('ENOENT')
            })

            const customConfig: PackageManagerConfig = {
              customPaths: {
                [executable]: ['/custom/path/' + executable],
              },
            }
            testSearch.setCustomConfig(customConfig)

            const result = await testSearch.findExecutable(executable, ['/common/path/' + executable])

            // Restore PATH
            process.env.PATH = originalPath

            // Verify result is found
            if (!result) {
              return false
            }

            // Verify the correct discovery method based on which tier succeeded
            const expectedMethods: Record<number, string> = {
              1: 'direct_command',
              2: 'path_scan',
              3: 'common_path',
              4: 'custom_path'
            }
            
            return result.method === expectedMethods[successTier]
          }
        ),
        { numRuns: 50 }
      )
    })

    it('Property 7: should set inPath correctly based on discovery tier', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            executable: fc.constantFrom('testexec1', 'testexec2', 'testexec3', 'testexec4', 'testexec5'),
            tier: fc.integer({ min: 1, max: 4 }),
          }),
          async ({ executable, tier }) => {
            // Save original PATH
            const originalPath = process.env.PATH

            const testCache = new PathCache()
            const testSearch = new TieredPathSearch(testCache)

            // Mock based on tier
            if (tier === 1) {
              // Tier 1: Direct command succeeds
              mockExecuteSafe.mockResolvedValueOnce({
                success: true,
                stdout: 'version 1.0',
                stderr: '',
                exitCode: 0,
              })
            } else if (tier === 2) {
              // Tier 2: Direct command fails, PATH scan succeeds
              process.env.PATH = '/usr/local/bin:/usr/bin'
              mockExecuteSafe
                .mockResolvedValueOnce({
                  success: false,
                  stdout: '',
                  stderr: 'not found',
                  exitCode: 1,
                })
                .mockResolvedValueOnce({
                  success: true,
                  stdout: 'version 1.0',
                  stderr: '',
                  exitCode: 0,
                })
              mockStat.mockResolvedValue({ isFile: () => true } as any)
            } else if (tier === 3) {
              // Tier 3: Direct command fails, PATH empty, common path succeeds
              process.env.PATH = ''
              mockExecuteSafe
                .mockResolvedValueOnce({
                  success: false,
                  stdout: '',
                  stderr: 'not found',
                  exitCode: 1,
                })
                .mockResolvedValueOnce({
                  success: true,
                  stdout: 'version 1.0',
                  stderr: '',
                  exitCode: 0,
                })
              mockStat.mockResolvedValue({ isFile: () => true } as any)
            } else {
              // Tier 4: Direct command fails, PATH empty, common path fails, custom path succeeds
              process.env.PATH = ''
              mockExecuteSafe
                .mockResolvedValueOnce({
                  success: false,
                  stdout: '',
                  stderr: 'not found',
                  exitCode: 1,
                })
                .mockResolvedValueOnce({
                  success: true,
                  stdout: 'version 1.0',
                  stderr: '',
                  exitCode: 0,
                })
              mockStat
                .mockRejectedValueOnce(new Error('ENOENT')) // Common path fails
                .mockResolvedValueOnce({ isFile: () => true } as any) // Custom path succeeds
            }

            const customConfig: PackageManagerConfig = {
              customPaths: {
                [executable]: ['/custom/path'],
              },
            }
            testSearch.setCustomConfig(customConfig)

            const result = await testSearch.findExecutable(executable, ['/common/path'])

            // Restore PATH
            process.env.PATH = originalPath

            if (!result) {
              return false // Should always find something in our test setup
            }

            // Tier 1 and 2 should have inPath = true
            // Tier 3 and 4 should have inPath = false
            const expectedInPath = tier <= 2
            return result.inPath === expectedInPath
          }
        ),
        { numRuns: 50 }
      )
    })

    it('Property 7: should cache results from any tier', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            executable: fc.constantFrom('testexec1', 'testexec2', 'testexec3', 'testexec4', 'testexec5'),
            tier: fc.integer({ min: 1, max: 4 }),
          }),
          async ({ executable, tier }) => {
            // Save original PATH
            const originalPath = process.env.PATH
            // Set empty PATH for tiers 3 and 4
            if (tier >= 3) {
              process.env.PATH = ''
            }

            const testCache = new PathCache()
            const testSearch = new TieredPathSearch(testCache)

            // Set up mocks for the specified tier
            if (tier === 1) {
              mockExecuteSafe.mockResolvedValue({
                success: true,
                stdout: 'version 1.0',
                stderr: '',
                exitCode: 0,
              })
            } else {
              mockExecuteSafe
                .mockResolvedValueOnce({
                  success: false,
                  stdout: '',
                  stderr: 'not found',
                  exitCode: 1,
                })
                .mockResolvedValue({
                  success: true,
                  stdout: 'version 1.0',
                  stderr: '',
                  exitCode: 0,
                })

              mockStat.mockResolvedValue({ isFile: () => true } as any)
            }

            const customConfig: PackageManagerConfig = {
              customPaths: {
                [executable]: ['/custom/path'],
              },
            }
            testSearch.setCustomConfig(customConfig)

            const result = await testSearch.findExecutable(executable, ['/common/path'])

            // Restore PATH
            process.env.PATH = originalPath

            if (!result) {
              return false
            }

            // Verify result is cached
            const cachedPath = testCache.getPath(executable)
            return cachedPath === result.path
          }
        ),
        { numRuns: 50 }
      )
    })

    it('Property 7: should return correct discovery method for each tier', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { tier: 1, method: 'direct_command' as const },
            { tier: 2, method: 'path_scan' as const },
            { tier: 3, method: 'common_path' as const },
            { tier: 4, method: 'custom_path' as const }
          ),
          async ({ tier, method }) => {
            // Save original PATH
            const originalPath = process.env.PATH

            const testCache = new PathCache()
            const testSearch = new TieredPathSearch(testCache)
            const executable = 'test-exec'

            // Set up mocks for the specified tier
            if (tier === 1) {
              mockExecuteSafe.mockResolvedValue({
                success: true,
                stdout: 'version 1.0',
                stderr: '',
                exitCode: 0,
              })
            } else if (tier === 2) {
              // Tier 2: Set PATH and succeed in PATH scan
              process.env.PATH = '/usr/local/bin:/usr/bin'
              mockExecuteSafe
                .mockResolvedValueOnce({
                  success: false,
                  stdout: '',
                  stderr: 'not found',
                  exitCode: 1,
                })
                .mockResolvedValue({
                  success: true,
                  stdout: 'version 1.0',
                  stderr: '',
                  exitCode: 0,
                })
              mockStat.mockResolvedValue({ isFile: () => true } as any)
            } else if (tier === 3) {
              // Tier 3: Empty PATH, succeed in common path
              process.env.PATH = ''
              mockExecuteSafe
                .mockResolvedValueOnce({
                  success: false,
                  stdout: '',
                  stderr: 'not found',
                  exitCode: 1,
                })
                .mockResolvedValue({
                  success: true,
                  stdout: 'version 1.0',
                  stderr: '',
                  exitCode: 0,
                })
              mockStat.mockResolvedValue({ isFile: () => true } as any)
            } else {
              // Tier 4: Empty PATH, fail common path, succeed custom path
              process.env.PATH = ''
              mockExecuteSafe
                .mockResolvedValueOnce({
                  success: false,
                  stdout: '',
                  stderr: 'not found',
                  exitCode: 1,
                })
                .mockResolvedValue({
                  success: true,
                  stdout: 'version 1.0',
                  stderr: '',
                  exitCode: 0,
                })
              mockStat
                .mockRejectedValueOnce(new Error('ENOENT'))
                .mockResolvedValue({ isFile: () => true } as any)
            }

            const customConfig: PackageManagerConfig = {
              customPaths: {
                [executable]: ['/custom/path'],
              },
            }
            testSearch.setCustomConfig(customConfig)

            const result = await testSearch.findExecutable(executable, ['/common/path'])

            // Restore PATH
            process.env.PATH = originalPath

            if (!result) {
              return false
            }

            return result.method === method
          }
        ),
        { numRuns: 50 }
      )
    })

    it('Property 7: should handle multiple common paths and stop at first success', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 5, maxLength: 30 }), { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          async (paths, successIndex) => {
            if (successIndex >= paths.length) {
              return true // Skip if index out of bounds
            }

            // Save original PATH
            const originalPath = process.env.PATH
            // Set empty PATH to skip tier 2
            process.env.PATH = ''

            const testCache = new PathCache()
            const testSearch = new TieredPathSearch(testCache)

            // Fail tier 1
            mockExecuteSafe
              .mockResolvedValueOnce({
                success: false,
                stdout: '',
                stderr: 'not found',
                exitCode: 1,
              })
              .mockResolvedValue({
                success: true,
                stdout: 'version 1.0',
                stderr: '',
                exitCode: 0,
              })

            // Mock stat to fail for paths before successIndex, succeed at successIndex
            let statCallCount = 0
            mockStat.mockImplementation(async () => {
              const currentIndex = statCallCount++
              if (currentIndex === successIndex) {
                return { isFile: () => true } as any
              }
              throw new Error('ENOENT')
            })

            const result = await testSearch.findExecutable('test-exec', paths)

            // Restore PATH
            process.env.PATH = originalPath

            if (!result) {
              return false
            }

            // Should have stopped at the success index
            // statCallCount should be successIndex + 1 (0-indexed)
            return statCallCount === successIndex + 1 && result.method === 'common_path'
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty common paths array', async () => {
      // Save original PATH
      const originalPath = process.env.PATH
      // Set empty PATH to skip tier 2
      process.env.PATH = ''

      mockExecuteSafe.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'not found',
        exitCode: 1,
      })

      mockStat.mockRejectedValue(new Error('ENOENT'))

      const result = await search.findExecutable('nonexistent-tool', [])
      
      // Restore PATH
      process.env.PATH = originalPath

      expect(result).toBeNull()
    })

    it('should handle verification failure', async () => {
      // Save original PATH
      const originalPath = process.env.PATH
      // Set empty PATH to skip tier 2
      process.env.PATH = ''

      // Tier 1 fails
      mockExecuteSafe
        .mockResolvedValueOnce({
          success: false,
          stdout: '',
          stderr: 'not found',
          exitCode: 1,
        })
        // Verification fails for first common path
        .mockResolvedValueOnce({
          success: false,
          stdout: '',
          stderr: 'verification failed',
          exitCode: 1,
        })

      // File exists but verification will fail
      mockStat.mockResolvedValue({ isFile: () => true } as any)

      const result = await search.findExecutable('nonexistent-tool-xyz', ['/usr/local/bin/nonexistent-tool-xyz'])
      
      // Restore PATH
      process.env.PATH = originalPath

      // Should be null because verification failed and no other paths to try
      expect(result).toBeNull()
    })
  })

  describe('Custom Config Loading', () => {
    it('should load custom config from file', async () => {
      const mockConfig: PackageManagerConfig = {
        customPaths: {
          brew: ['/custom/brew'],
        },
      }

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig))

      const config = await TieredPathSearch.loadCustomConfig()
      
      expect(config).not.toBeNull()
      expect(config?.customPaths?.brew).toEqual(['/custom/brew'])
    })

    it('should return null when config file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'))

      const config = await TieredPathSearch.loadCustomConfig()
      
      expect(config).toBeNull()
    })

    it('should return null when config file is invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json{')

      const config = await TieredPathSearch.loadCustomConfig()
      
      expect(config).toBeNull()
    })
  })
})
