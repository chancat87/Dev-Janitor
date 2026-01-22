/**
 * Dev Janitor - Parsing Resilience Property Tests
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
import { BrewHandler } from './handlers/brewHandler'
import { CondaHandler } from './handlers/condaHandler'
import { PipxHandler } from './handlers/pipxHandler'
import { PyenvHandler } from './handlers/pyenvHandler'
import { TieredPathSearch } from './tieredPathSearch'
import * as commandExecutor from '../commandExecutor'

describe('Parsing Resilience and Error Handling', () => {
  let cache: PathCache
  let pathSearch: TieredPathSearch

  beforeEach(() => {
    cache = new PathCache()
    pathSearch = new TieredPathSearch(cache)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Property 6: Parsing Resilience', () => {
    /**
     * Feature: enhanced-package-discovery
     * Property 6: Parsing Resilience
     * **Validates: Requirements 9.1, 9.2, 9.3**
     * 
     * For any input string (including malformed, empty, or invalid JSON):
     * - Parsing SHALL NOT throw an exception
     * - Parsing SHALL return an array (possibly empty)
     * - Valid entries in malformed input SHALL still be extracted
     */

    describe('BrewHandler Parsing Resilience', () => {
      it('should handle malformed input without throwing', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (input) => {
              const handler = new BrewHandler(pathSearch)
              
              // Should not throw
              const result = handler.parseOutput(input)
              
              // Should return an array
              expect(Array.isArray(result)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should return empty array for empty input', () => {
        const handler = new BrewHandler(pathSearch)
        
        expect(handler.parseOutput('')).toEqual([])
        expect(handler.parseOutput('   ')).toEqual([])
        expect(handler.parseOutput('\n\n')).toEqual([])
      })

      it('should extract valid entries from partially malformed input', () => {
        const handler = new BrewHandler(pathSearch)
        
        // Mix of valid and invalid lines
        const input = `
node 18.0.0
invalid-line-without-version
python 3.11.4
   
malformed
git 2.40.0
`
        
        const result = handler.parseOutput(input)
        
        // Should extract the valid entries
        expect(result.length).toBeGreaterThan(0)
        expect(result.some(p => p.name === 'node' && p.version === '18.0.0')).toBe(true)
        expect(result.some(p => p.name === 'python' && p.version === '3.11.4')).toBe(true)
        expect(result.some(p => p.name === 'git' && p.version === '2.40.0')).toBe(true)
      })

      it('should handle lines with extra whitespace', () => {
        const handler = new BrewHandler(pathSearch)
        
        const input = `  node   18.0.0  
          python    3.11.4    
git 2.40.0`
        
        const result = handler.parseOutput(input)
        
        expect(result.length).toBe(3)
        expect(result[0].name).toBe('node')
        expect(result[1].name).toBe('python')
        expect(result[2].name).toBe('git')
      })
    })

    describe('CondaHandler Parsing Resilience', () => {
      it('should handle invalid JSON without throwing', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (input) => {
              const handler = new CondaHandler(pathSearch)
              
              // Should not throw
              const result = handler.parseOutput(input)
              
              // Should return an array
              expect(Array.isArray(result)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should fallback to text parsing when JSON fails', () => {
        const handler = new CondaHandler(pathSearch)
        
        // Invalid JSON but valid text format
        const input = `numpy 1.24.3 py311h08b1b3b_0 defaults
pandas 2.0.0 py311h08b1b3b_0 conda-forge`
        
        const result = handler.parseOutput(input)
        
        // Should parse as text
        expect(result.length).toBe(2)
        expect(result[0].name).toBe('numpy')
        expect(result[0].version).toBe('1.24.3')
        expect(result[1].name).toBe('pandas')
      })

      it('should handle valid JSON', () => {
        const handler = new CondaHandler(pathSearch)
        
        const input = JSON.stringify([
          { name: 'numpy', version: '1.24.3', channel: 'defaults' },
          { name: 'pandas', version: '2.0.0', channel: 'conda-forge' }
        ])
        
        const result = handler.parseOutput(input)
        
        expect(result.length).toBe(2)
        expect(result[0].name).toBe('numpy')
        expect(result[0].channel).toBe('defaults')
      })

      it('should handle malformed JSON array', () => {
        const handler = new CondaHandler(pathSearch)
        
        // Malformed JSON
        const input = '[{"name": "numpy", "version": "1.24.3"'
        
        const result = handler.parseOutput(input)
        
        // Should not throw and return array
        expect(Array.isArray(result)).toBe(true)
      })

      it('should filter out invalid entries in JSON', () => {
        const handler = new CondaHandler(pathSearch)
        
        const input = JSON.stringify([
          { name: 'numpy', version: '1.24.3' },
          { name: '', version: '2.0.0' }, // Invalid: empty name
          { name: 'pandas', version: '' }, // Invalid: empty version
          { name: 'scipy', version: '1.10.0' }
        ])
        
        const result = handler.parseOutput(input)
        
        // Should only include valid entries
        expect(result.length).toBe(2)
        expect(result[0].name).toBe('numpy')
        expect(result[1].name).toBe('scipy')
      })
    })

    describe('PipxHandler Parsing Resilience', () => {
      it('should handle invalid JSON without throwing', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (input) => {
              const handler = new PipxHandler(pathSearch)
              
              // Should not throw
              const result = handler.parseOutput(input)
              
              // Should return an array
              expect(Array.isArray(result)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should fallback to text parsing when JSON fails', () => {
        const handler = new PipxHandler(pathSearch)
        
        // Invalid JSON but valid text format
        const input = `black 23.3.0
flake8 6.0.0`
        
        const result = handler.parseOutput(input)
        
        // Should parse as text
        expect(result.length).toBe(2)
        expect(result[0].name).toBe('black')
        expect(result[1].name).toBe('flake8')
      })

      it('should handle valid pipx JSON structure', () => {
        const handler = new PipxHandler(pathSearch)
        
        const input = JSON.stringify({
          venvs: {
            black: {
              metadata: {
                main_package: {
                  package: 'black',
                  package_version: '23.3.0'
                }
              }
            },
            flake8: {
              metadata: {
                main_package: {
                  package: 'flake8',
                  package_version: '6.0.0'
                }
              }
            }
          }
        })
        
        const result = handler.parseOutput(input)
        
        expect(result.length).toBe(2)
        expect(result[0].name).toBe('black')
        expect(result[0].version).toBe('23.3.0')
      })

      it('should skip malformed venv entries', () => {
        const handler = new PipxHandler(pathSearch)
        
        const input = JSON.stringify({
          venvs: {
            black: {
              metadata: {
                main_package: {
                  package: 'black',
                  package_version: '23.3.0'
                }
              }
            },
            invalid: {
              // Missing metadata structure
            },
            flake8: {
              metadata: {
                main_package: {
                  package: 'flake8',
                  package_version: '6.0.0'
                }
              }
            }
          }
        })
        
        const result = handler.parseOutput(input)
        
        // Should only include valid entries
        expect(result.length).toBe(2)
        expect(result.some(p => p.name === 'black')).toBe(true)
        expect(result.some(p => p.name === 'flake8')).toBe(true)
      })
    })

    describe('PyenvHandler Parsing Resilience', () => {
      it('should handle malformed input without throwing', () => {
        fc.assert(
          fc.property(
            fc.string(),
            (input) => {
              const handler = new PyenvHandler(pathSearch)
              
              // Should not throw
              const result = handler.parseOutput(input)
              
              // Should return an array
              expect(Array.isArray(result)).toBe(true)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should parse valid pyenv output', () => {
        const handler = new PyenvHandler(pathSearch)
        
        const input = `3.11.4
3.10.12
2.7.18
pypy3.9-7.3.11`
        
        const result = handler.parseOutput(input)
        
        expect(result.length).toBe(4)
        expect(result[0].version).toBe('3.11.4')
        expect(result[1].version).toBe('3.10.12')
        expect(result[2].version).toBe('2.7.18')
        expect(result[3].version).toBe('pypy3.9-7.3.11')
        
        // All should have name 'python'
        expect(result.every(p => p.name === 'python')).toBe(true)
      })

      it('should handle empty lines and whitespace', () => {
        const handler = new PyenvHandler(pathSearch)
        
        const input = `
3.11.4

3.10.12
  
2.7.18
`
        
        const result = handler.parseOutput(input)
        
        expect(result.length).toBe(3)
      })
    })
  })

  describe('Property 10: Unavailable Manager Graceful Handling', () => {
    /**
     * Feature: enhanced-package-discovery
     * Property 10: Unavailable Manager Graceful Handling
     * **Validates: Requirements 1.3, 2.2, 3.2, 4.2, 5.2**
     * 
     * For any package manager that is not installed, scanning SHALL:
     * - Return an empty array
     * - NOT throw an error
     * - NOT block other package managers
     */

    it('should return empty array when manager is not available', async () => {
      const discovery = new PackageDiscovery(cache)
      
      // Mock all commands to fail (manager not installed)
      vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'command not found',
        exitCode: 127
      })

      // Should not throw
      const packages = await discovery.listPackages('brew')
      
      // Should return empty array
      expect(packages).toEqual([])
    })

    it('should not throw when listing packages from unavailable manager', () => {
      fc.assert(
        fc.asyncProperty(
          fc.constantFrom('brew', 'conda', 'pipx', 'poetry', 'pyenv'),
          async (manager) => {
            const testCache = new PathCache()
            const testDiscovery = new PackageDiscovery(testCache)
            
            // Mock manager as unavailable
            vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
              success: false,
              stdout: '',
              stderr: 'not found',
              exitCode: 127
            })

            // Should not throw
            const packages = await testDiscovery.listPackages(manager as any)
            
            // Should return empty array
            expect(Array.isArray(packages)).toBe(true)
            expect(packages.length).toBe(0)
            
            vi.restoreAllMocks()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should handle command execution errors gracefully', async () => {
      const discovery = new PackageDiscovery(cache)
      
      // Mock command to throw error
      vi.spyOn(commandExecutor, 'executeSafe').mockRejectedValue(
        new Error('Command execution failed')
      )

      // Should not throw
      const packages = await discovery.listPackages('brew')
      
      // Should return empty array
      expect(packages).toEqual([])
    })

    it('should continue with other managers when one fails', async () => {
      const discovery = new PackageDiscovery(cache)
      
      let brewCalled = false
      let condaCalled = false
      
      // Mock brew to fail, conda to succeed
      vi.spyOn(commandExecutor, 'executeSafe').mockImplementation(async (command: string) => {
        if (command.includes('brew')) {
          brewCalled = true
          throw new Error('Brew failed')
        }
        
        if (command.includes('conda')) {
          condaCalled = true
          return {
            success: true,
            stdout: JSON.stringify([{ name: 'numpy', version: '1.24.3' }]),
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

      // Should not throw
      const packages = await discovery.listAllPackages()
      
      // Both managers should have been attempted
      expect(brewCalled).toBe(true)
      expect(condaCalled).toBe(true)
      
      // Should have packages from conda despite brew failure
      expect(Array.isArray(packages)).toBe(true)
    })

    it('unavailable managers return empty arrays consistently', () => {
      fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.constantFrom('brew', 'conda', 'pipx', 'poetry', 'pyenv'),
            { minLength: 1, maxLength: 5 }
          ).map(arr => [...new Set(arr)]), // Remove duplicates
          async (managers) => {
            const testCache = new PathCache()
            const testDiscovery = new PackageDiscovery(testCache)
            
            // Mock all managers as unavailable
            vi.spyOn(commandExecutor, 'executeSafe').mockResolvedValue({
              success: false,
              stdout: '',
              stderr: 'not found',
              exitCode: 127
            })

            // Check each manager
            for (const manager of managers) {
              const packages = await testDiscovery.listPackages(manager as any)
              
              // Should return empty array
              expect(Array.isArray(packages)).toBe(true)
              expect(packages.length).toBe(0)
            }
            
            vi.restoreAllMocks()
          }
        ),
        { numRuns: 10 }
      )
    })
  })
})
