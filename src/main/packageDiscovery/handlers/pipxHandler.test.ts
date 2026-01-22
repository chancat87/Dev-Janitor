/**
 * Dev Janitor - Pipx Handler Tests
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

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { PipxHandler } from './pipxHandler'
import { TieredPathSearch } from '../tieredPathSearch'
import { PathCache } from '../pathCache'

describe('PipxHandler', () => {
  let handler: PipxHandler
  let pathSearch: TieredPathSearch
  let cache: PathCache

  beforeEach(() => {
    cache = new PathCache()
    pathSearch = new TieredPathSearch(cache)
    handler = new PipxHandler(pathSearch)
  })

  describe('Basic Properties', () => {
    it('should have correct id', () => {
      expect(handler.id).toBe('pipx')
    })

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Pipx')
    })

    it('should have correct executable', () => {
      expect(handler.executable).toBe('pipx')
    })

    it('should have common paths defined', () => {
      expect(handler.commonPaths).toBeInstanceOf(Array)
      expect(handler.commonPaths.length).toBeGreaterThan(0)
    })
  })

  describe('Property 1: Parser Output Correctness', () => {
    /**
     * Feature: enhanced-package-discovery
     * Property 1: Parser Output Correctness
     * **Validates: Requirements 3.3, 3.4**
     * 
     * For any valid Pipx JSON output, parsing SHALL produce an array of PackageInfo
     * objects where each object has:
     * - A non-empty name field
     * - A non-empty version field
     * - The manager field set to 'pipx'
     * - The location field set to 'pipx-venv'
     * - Optional environment field with venv name
     */
    it('should parse valid pipx JSON output correctly', () => {
      // Generator for valid pipx venv structure
      const pipxVenvArb = fc.record({
        metadata: fc.record({
          main_package: fc.record({
            package: fc.string({ minLength: 1, maxLength: 50 })
              .filter(s => s.trim() === s && s.length > 0),
            package_version: fc.string({ minLength: 1, maxLength: 30 })
              .filter(s => /^\d/.test(s) && s.trim() === s)
          })
        })
      })

      const pipxJsonArb = fc.dictionary(
        fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => s.trim() === s && s.length > 0),
        pipxVenvArb,
        { minKeys: 0, maxKeys: 20 }
      ).map(venvs => JSON.stringify({ venvs }))

      fc.assert(
        fc.property(pipxJsonArb, (output) => {
          const result = handler.parseOutput(output)

          // All results should be valid PackageInfo objects
          return result.every(pkg =>
            pkg.name.length > 0 &&
            pkg.version.length > 0 &&
            pkg.manager === 'pipx' &&
            pkg.location === 'pipx-venv'
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should extract venv name as environment field', () => {
      const venvName = 'my-cli-tool'
      const packageName = 'cli-tool'
      const packageVersion = '1.2.3'

      const output = JSON.stringify({
        venvs: {
          [venvName]: {
            metadata: {
              main_package: {
                package: packageName,
                package_version: packageVersion
              }
            }
          }
        }
      })

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe(packageName)
      expect(result[0].version).toBe(packageVersion)
      expect(result[0].environment).toBe(venvName)
    })

    it('should handle multiple venvs', () => {
      const output = JSON.stringify({
        venvs: {
          'black': {
            metadata: {
              main_package: {
                package: 'black',
                package_version: '23.3.0'
              }
            }
          },
          'pylint': {
            metadata: {
              main_package: {
                package: 'pylint',
                package_version: '2.17.4'
              }
            }
          },
          'pytest': {
            metadata: {
              main_package: {
                package: 'pytest',
                package_version: '7.3.1'
              }
            }
          }
        }
      })

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(3)
      
      const names = result.map(pkg => pkg.name).sort()
      expect(names).toEqual(['black', 'pylint', 'pytest'])
      
      result.forEach(pkg => {
        expect(pkg.manager).toBe('pipx')
        expect(pkg.location).toBe('pipx-venv')
      })
    })

    it('should filter out venvs without valid metadata', () => {
      const output = JSON.stringify({
        venvs: {
          'valid-package': {
            metadata: {
              main_package: {
                package: 'valid-package',
                package_version: '1.0.0'
              }
            }
          },
          'invalid-no-metadata': {
            // Missing metadata
          },
          'invalid-no-main-package': {
            metadata: {
              // Missing main_package
            }
          },
          'invalid-empty-name': {
            metadata: {
              main_package: {
                package: '',
                package_version: '2.0.0'
              }
            }
          },
          'invalid-empty-version': {
            metadata: {
              main_package: {
                package: 'package',
                package_version: ''
              }
            }
          },
          'another-valid': {
            metadata: {
              main_package: {
                package: 'another-valid',
                package_version: '3.0.0'
              }
            }
          }
        }
      })

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('valid-package')
      expect(result[1].name).toBe('another-valid')
    })
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
     * - Valid entries in malformed input SHALL still be extracted (via text fallback)
     */
    it('should never throw on any input', () => {
      const anyStringArb = fc.string({ maxLength: 1000 })

      fc.assert(
        fc.property(anyStringArb, (input) => {
          let threw = false
          let result: unknown

          try {
            result = handler.parseOutput(input)
          } catch {
            threw = true
          }

          return !threw && Array.isArray(result)
        }),
        { numRuns: 100 }
      )
    })

    it('should return empty array for empty input', () => {
      expect(handler.parseOutput('')).toEqual([])
      expect(handler.parseOutput('   ')).toEqual([])
      expect(handler.parseOutput('\n\n')).toEqual([])
    })

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = '{ invalid json content'
      const result = handler.parseOutput(invalidJson)
      
      // Should not throw and should return an array
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle JSON without venvs field', () => {
      const output = JSON.stringify({ some_other_field: 'value' })
      const result = handler.parseOutput(output)
      
      expect(result).toEqual([])
    })

    it('should handle non-object venvs field', () => {
      const output = JSON.stringify({ venvs: 'not an object' })
      const result = handler.parseOutput(output)
      
      expect(result).toEqual([])
    })

    it('should use text fallback when JSON parsing fails', () => {
      // Simulate pipx text output format
      const textOutput = `
   black 23.3.0
   pylint 2.17.4
   pytest 7.3.1
      `.trim()

      const result = handler.parseOutput(textOutput)

      expect(result.length).toBeGreaterThan(0)
      expect(result.every(pkg => pkg.manager === 'pipx')).toBe(true)
    })

    it('should skip malformed lines in text fallback', () => {
      const textOutput = `
black 23.3.0
invalid-line-without-version
pylint 2.17.4
another-bad-line
pytest 7.3.1
      `.trim()

      const result = handler.parseOutput(textOutput)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('black')
      expect(result[1].name).toBe('pylint')
      expect(result[2].name).toBe('pytest')
    })

    it('should handle mixed valid and invalid venv entries', () => {
      const validVenvArb = fc.record({
        metadata: fc.record({
          main_package: fc.record({
            package: fc.string({ minLength: 1 }).filter(s => s.trim() === s),
            package_version: fc.string({ minLength: 1 }).filter(s => /^\d/.test(s) && s.trim() === s)
          })
        })
      })

      const invalidVenvArb = fc.oneof(
        fc.constant({}), // Empty object
        fc.constant({ metadata: {} }), // Missing main_package
        fc.constant({ metadata: { main_package: { package: '', package_version: '1.0.0' } } }), // Empty package
        fc.constant({ metadata: { main_package: { package: 'pkg', package_version: '' } } }) // Empty version
      )

      const mixedVenvsArb = fc.dictionary(
        fc.string({ minLength: 1 }).filter(s => s.trim() === s),
        fc.oneof(validVenvArb, invalidVenvArb),
        { minKeys: 1, maxKeys: 10 }
      ).map(venvs => JSON.stringify({ venvs }))

      fc.assert(
        fc.property(mixedVenvsArb, (output) => {
          let threw = false
          let result: unknown

          try {
            result = handler.parseOutput(output)
          } catch {
            threw = true
          }

          // Should not throw and should return an array
          if (threw || !Array.isArray(result)) {
            return false
          }

          // All returned items should be valid
          return result.every(pkg =>
            pkg.name && pkg.name.length > 0 &&
            pkg.version && pkg.version.length > 0 &&
            pkg.manager === 'pipx' &&
            pkg.location === 'pipx-venv'
          )
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 3: Uninstall Command Correctness', () => {
    /**
     * Feature: enhanced-package-discovery
     * Property 3: Correct Uninstall Command Execution
     * **Validates: Requirement 7.4**
     * 
     * For any package name, uninstalling SHALL use:
     * - `pipx uninstall <package>`
     * 
     * Note: We test the command structure by verifying the method signature
     * and behavior, not by actually executing uninstall commands in property tests.
     */
    it('should accept package name for uninstall', async () => {
      const result = await handler.uninstallPackage('nonexistent-package')
      expect(typeof result).toBe('boolean')
    })

    it('should handle various package name formats', async () => {
      const testCases = [
        'simple-package',
        'package-with-dashes',
        'package_with_underscores',
        'package.name',
        'black',
        'pylint',
        'pytest'
      ]

      for (const packageName of testCases) {
        const result = await handler.uninstallPackage(packageName)
        expect(typeof result).toBe('boolean')
      }
    })

    it('should accept options parameter', async () => {
      const result = await handler.uninstallPackage('nonexistent-package', { force: true })
      expect(typeof result).toBe('boolean')
    })
  })

  describe('Unit Tests - Specific Examples', () => {
    it('should parse real pipx JSON output', () => {
      const output = JSON.stringify({
        venvs: {
          'black': {
            metadata: {
              main_package: {
                package: 'black',
                package_version: '23.3.0'
              }
            }
          },
          'pylint': {
            metadata: {
              main_package: {
                package: 'pylint',
                package_version: '2.17.4'
              }
            }
          },
          'pytest': {
            metadata: {
              main_package: {
                package: 'pytest',
                package_version: '7.3.1'
              }
            }
          }
        }
      })

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(3)
      
      const blackPkg = result.find(pkg => pkg.name === 'black')
      expect(blackPkg).toEqual({
        name: 'black',
        version: '23.3.0',
        location: 'pipx-venv',
        manager: 'pipx',
        environment: 'black'
      })

      const pylintPkg = result.find(pkg => pkg.name === 'pylint')
      expect(pylintPkg).toEqual({
        name: 'pylint',
        version: '2.17.4',
        location: 'pipx-venv',
        manager: 'pipx',
        environment: 'pylint'
      })

      const pytestPkg = result.find(pkg => pkg.name === 'pytest')
      expect(pytestPkg).toEqual({
        name: 'pytest',
        version: '7.3.1',
        location: 'pipx-venv',
        manager: 'pipx',
        environment: 'pytest'
      })
    })

    it('should parse pipx text output format', () => {
      const output = `
   black 23.3.0
   pylint 2.17.4
   pytest 7.3.1
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('black')
      expect(result[0].version).toBe('23.3.0')
      expect(result[1].name).toBe('pylint')
      expect(result[1].version).toBe('2.17.4')
      expect(result[2].name).toBe('pytest')
      expect(result[2].version).toBe('7.3.1')
    })

    it('should skip header lines in text output', () => {
      const output = `
venvs are in /home/user/.local/pipx/venvs
   black 23.3.0
   pylint 2.17.4
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('black')
      expect(result[1].name).toBe('pylint')
    })

    it('should handle version strings with various formats', () => {
      const output = JSON.stringify({
        venvs: {
          'package1': {
            metadata: {
              main_package: {
                package: 'package1',
                package_version: '1.0.0'
              }
            }
          },
          'package2': {
            metadata: {
              main_package: {
                package: 'package2',
                package_version: '2.3.4-beta'
              }
            }
          },
          'package3': {
            metadata: {
              main_package: {
                package: 'package3',
                package_version: '3.0.0rc1'
              }
            }
          },
          'package4': {
            metadata: {
              main_package: {
                package: 'package4',
                package_version: '4.5.6+build.123'
              }
            }
          }
        }
      })

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(4)
      expect(result[0].version).toBe('1.0.0')
      expect(result[1].version).toBe('2.3.4-beta')
      expect(result[2].version).toBe('3.0.0rc1')
      expect(result[3].version).toBe('4.5.6+build.123')
    })

    it('should handle empty venvs object', () => {
      const output = JSON.stringify({ venvs: {} })
      const result = handler.parseOutput(output)

      expect(result).toEqual([])
    })

    it('should handle venv with different package name than venv name', () => {
      const output = JSON.stringify({
        venvs: {
          'my-custom-name': {
            metadata: {
              main_package: {
                package: 'actual-package-name',
                package_version: '1.0.0'
              }
            }
          }
        }
      })

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('actual-package-name')
      expect(result[0].environment).toBe('my-custom-name')
    })
  })
})
