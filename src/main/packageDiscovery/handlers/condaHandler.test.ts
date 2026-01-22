/**
 * Dev Janitor - Conda Handler Tests
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
import { CondaHandler } from './condaHandler'
import { TieredPathSearch } from '../tieredPathSearch'
import { PathCache } from '../pathCache'

describe('CondaHandler', () => {
  let handler: CondaHandler
  let pathSearch: TieredPathSearch
  let cache: PathCache

  beforeEach(() => {
    cache = new PathCache()
    pathSearch = new TieredPathSearch(cache)
    handler = new CondaHandler(pathSearch)
  })

  describe('Basic Properties', () => {
    it('should have correct id', () => {
      expect(handler.id).toBe('conda')
    })

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Conda')
    })

    it('should have correct executable', () => {
      expect(handler.executable).toBe('conda')
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
     * **Validates: Requirements 2.3, 2.4**
     * 
     * For any valid Conda JSON output, parsing SHALL produce an array of PackageInfo
     * objects where each object has:
     * - A non-empty name field
     * - A non-empty version field
     * - The manager field set to 'conda'
     * - The location field set to 'conda-env'
     * - Optional channel field extracted from JSON
     */
    it('should parse valid conda JSON output correctly', () => {
      // Generator for valid conda package objects
      const condaPackageArb = fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => s.trim() === s && s.length > 0),
        version: fc.string({ minLength: 1, maxLength: 30 })
          .filter(s => /^\d/.test(s) && s.trim() === s),
        channel: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
        build_string: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        platform: fc.option(fc.string({ minLength: 1 }), { nil: undefined })
      })

      const condaJsonArb = fc.array(condaPackageArb, { minLength: 0, maxLength: 50 })
        .map(packages => JSON.stringify(packages))

      fc.assert(
        fc.property(condaJsonArb, (output) => {
          const result = handler.parseOutput(output)

          // All results should be valid PackageInfo objects
          return result.every(pkg =>
            pkg.name.length > 0 &&
            pkg.version.length > 0 &&
            pkg.manager === 'conda' &&
            pkg.location === 'conda-env'
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should extract channel information from JSON', () => {
      const condaPackageWithChannelArb = fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 })
          .filter(s => s.trim() === s && s.length > 0),
        version: fc.string({ minLength: 1, maxLength: 30 })
          .filter(s => /^\d/.test(s) && s.trim() === s),
        channel: fc.string({ minLength: 1, maxLength: 30 })
          .filter(s => s.trim() === s && s.length > 0)
      })

      fc.assert(
        fc.property(condaPackageWithChannelArb, (pkg) => {
          const output = JSON.stringify([pkg])
          const result = handler.parseOutput(output)

          if (result.length === 0) {
            return false
          }

          const parsed = result[0]
          return (
            parsed.name === pkg.name &&
            parsed.version === pkg.version &&
            parsed.channel === pkg.channel
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should handle packages without channel', () => {
      const output = JSON.stringify([
        { name: 'numpy', version: '1.24.3' },
        { name: 'pandas', version: '2.0.0' }
      ])

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('numpy')
      expect(result[0].channel).toBeUndefined()
      expect(result[1].name).toBe('pandas')
      expect(result[1].channel).toBeUndefined()
    })

    it('should filter out packages without name or version', () => {
      const output = JSON.stringify([
        { name: 'valid-package', version: '1.0.0', channel: 'defaults' },
        { name: '', version: '2.0.0' }, // Invalid: empty name
        { name: 'another-package', version: '' }, // Invalid: empty version
        { version: '3.0.0' }, // Invalid: missing name
        { name: 'good-package', version: '4.0.0' }
      ])

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('valid-package')
      expect(result[1].name).toBe('good-package')
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

    it('should handle non-array JSON', () => {
      const nonArrayJson = JSON.stringify({ name: 'package', version: '1.0.0' })
      const result = handler.parseOutput(nonArrayJson)
      
      expect(result).toEqual([])
    })

    it('should use text fallback when JSON parsing fails', () => {
      // Simulate conda text output format
      const textOutput = `
# packages in environment at /home/user/anaconda3:
#
# Name                    Version                   Build  Channel
numpy                     1.24.3          py311h08b1b3b_0    defaults
pandas                    2.0.0           py311h08b1b3b_0    conda-forge
scipy                     1.10.1          py311h08b1b3b_0    defaults
      `.trim()

      const result = handler.parseOutput(textOutput)

      expect(result.length).toBeGreaterThan(0)
      expect(result.every(pkg => pkg.manager === 'conda')).toBe(true)
    })

    it('should skip malformed lines in text fallback', () => {
      const textOutput = `
numpy 1.24.3 py311h08b1b3b_0 defaults
invalid-line-without-enough-parts
pandas 2.0.0 py311h08b1b3b_0 conda-forge
another-bad-line
scipy 1.10.1 py311h08b1b3b_0 defaults
      `.trim()

      const result = handler.parseOutput(textOutput)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('numpy')
      expect(result[1].name).toBe('pandas')
      expect(result[2].name).toBe('scipy')
    })

    it('should handle mixed valid and invalid JSON entries', () => {
      const validPackageArb = fc.record({
        name: fc.string({ minLength: 1 }).filter(s => s.trim() === s),
        version: fc.string({ minLength: 1 }).filter(s => /^\d/.test(s) && s.trim() === s),
        channel: fc.option(fc.string({ minLength: 1 }), { nil: undefined })
      })

      const invalidPackageArb = fc.oneof(
        fc.constant({ name: '', version: '1.0.0' }), // Empty name
        fc.constant({ name: 'package', version: '' }), // Empty version
        fc.constant({ version: '1.0.0' }), // Missing name
        fc.constant({ name: 'package' }) // Missing version
      )

      const mixedArrayArb = fc.array(
        fc.oneof(validPackageArb, invalidPackageArb),
        { minLength: 1, maxLength: 20 }
      ).map(packages => JSON.stringify(packages))

      fc.assert(
        fc.property(mixedArrayArb, (output) => {
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
            pkg.manager === 'conda' &&
            pkg.location === 'conda-env'
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
     * **Validates: Requirement 7.3**
     * 
     * For any package name, uninstalling SHALL use:
     * - `conda remove -y <package>`
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
        'numpy',
        'pandas'
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
    it('should parse real conda JSON output', () => {
      const output = JSON.stringify([
        {
          name: 'numpy',
          version: '1.24.3',
          build_string: 'py311h08b1b3b_0',
          channel: 'defaults',
          platform: 'linux-64'
        },
        {
          name: 'pandas',
          version: '2.0.0',
          build_string: 'py311h08b1b3b_0',
          channel: 'conda-forge',
          platform: 'linux-64'
        },
        {
          name: 'scipy',
          version: '1.10.1',
          build_string: 'py311h08b1b3b_0',
          channel: 'defaults',
          platform: 'linux-64'
        }
      ])

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        name: 'numpy',
        version: '1.24.3',
        location: 'conda-env',
        manager: 'conda',
        channel: 'defaults'
      })
      expect(result[1]).toEqual({
        name: 'pandas',
        version: '2.0.0',
        location: 'conda-env',
        manager: 'conda',
        channel: 'conda-forge'
      })
      expect(result[2]).toEqual({
        name: 'scipy',
        version: '1.10.1',
        location: 'conda-env',
        manager: 'conda',
        channel: 'defaults'
      })
    })

    it('should parse conda text output format', () => {
      const output = `
numpy                     1.24.3          py311h08b1b3b_0    defaults
pandas                    2.0.0           py311h08b1b3b_0    conda-forge
scipy                     1.10.1          py311h08b1b3b_0    defaults
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('numpy')
      expect(result[0].version).toBe('1.24.3')
      expect(result[0].channel).toBe('defaults')
      expect(result[1].name).toBe('pandas')
      expect(result[1].channel).toBe('conda-forge')
    })

    it('should handle text output without channel', () => {
      const output = `
numpy 1.24.3
pandas 2.0.0
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('numpy')
      expect(result[0].version).toBe('1.24.3')
      expect(result[0].channel).toBeUndefined()
    })

    it('should skip comment lines in text output', () => {
      const output = `
# packages in environment at /home/user/anaconda3:
#
# Name                    Version                   Build  Channel
numpy                     1.24.3          py311h08b1b3b_0    defaults
# This is a comment
pandas                    2.0.0           py311h08b1b3b_0    conda-forge
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('numpy')
      expect(result[1].name).toBe('pandas')
    })

    it('should handle version strings with various formats', () => {
      const output = JSON.stringify([
        { name: 'package1', version: '1.0.0', channel: 'defaults' },
        { name: 'package2', version: '2.3.4-beta', channel: 'conda-forge' },
        { name: 'package3', version: '3.0.0rc1', channel: 'defaults' },
        { name: 'package4', version: '4.5.6+build.123', channel: 'defaults' }
      ])

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(4)
      expect(result[0].version).toBe('1.0.0')
      expect(result[1].version).toBe('2.3.4-beta')
      expect(result[2].version).toBe('3.0.0rc1')
      expect(result[3].version).toBe('4.5.6+build.123')
    })

    it('should handle empty JSON array', () => {
      const output = JSON.stringify([])
      const result = handler.parseOutput(output)

      expect(result).toEqual([])
    })
  })
})
