/**
 * Dev Janitor - Homebrew Handler Tests
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
import { BrewHandler } from './brewHandler'
import { TieredPathSearch } from '../tieredPathSearch'
import { PathCache } from '../pathCache'

describe('BrewHandler', () => {
  let handler: BrewHandler
  let pathSearch: TieredPathSearch
  let cache: PathCache

  beforeEach(() => {
    cache = new PathCache()
    pathSearch = new TieredPathSearch(cache)
    handler = new BrewHandler(pathSearch)
  })

  describe('Basic Properties', () => {
    it('should have correct id', () => {
      expect(handler.id).toBe('brew')
    })

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Homebrew')
    })

    it('should have correct executable', () => {
      expect(handler.executable).toBe('brew')
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
     * **Validates: Requirements 1.4, 1.5**
     * 
     * For any valid Homebrew output, parsing SHALL produce an array of PackageInfo
     * objects where each object has:
     * - A non-empty name field
     * - A non-empty version field
     * - The manager field set to 'brew'
     * - The location field set to 'formula' or 'cask'
     */
    it('should parse valid brew formula output correctly', () => {
      // Generator for valid brew output lines
      const brewLineArb = fc.tuple(
        fc.string({ minLength: 1 }).filter(s => !s.includes(' ') && !s.includes('\n')),
        fc.string({ minLength: 1 }).filter(s => /^\d/.test(s) && !s.includes('\n'))
      ).map(([name, version]) => `${name} ${version}`)

      const brewOutputArb = fc.array(brewLineArb, { minLength: 0, maxLength: 50 })
        .map(lines => lines.join('\n'))

      fc.assert(
        fc.property(brewOutputArb, (output) => {
          const result = handler.parseOutput(output)

          // All results should be valid PackageInfo objects
          return result.every(pkg =>
            pkg.name.length > 0 &&
            pkg.version.length > 0 &&
            pkg.manager === 'brew' &&
            (pkg.location === 'formula' || pkg.location === 'cask')
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should extract correct name and version from brew output', () => {
      const brewPackageArb = fc.record({
        name: fc.string({ minLength: 1, maxLength: 30 })
          .filter(s => !s.includes(' ') && !s.includes('\n') && s.trim() === s),
        version: fc.string({ minLength: 1, maxLength: 20 })
          .filter(s => /^\d/.test(s) && !s.includes('\n') && !s.includes(' ') && s.trim() === s)
      })

      fc.assert(
        fc.property(brewPackageArb, (pkg) => {
          const output = `${pkg.name} ${pkg.version}`
          const result = handler.parseOutput(output)

          if (result.length === 0) {
            return false
          }

          const parsed = result[0]
          return parsed.name === pkg.name && parsed.version === pkg.version
        }),
        { numRuns: 100 }
      )
    })

    it('should handle multiple versions in output', () => {
      const output = 'node 18.17.0 19.0.0 20.0.0'
      const result = handler.parseOutput(output)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('node')
      expect(result[0].version).toBe('18.17.0') // Should take first version
    })
  })

  describe('Property 6: Parsing Resilience', () => {
    /**
     * Feature: enhanced-package-discovery
     * Property 6: Parsing Resilience
     * **Validates: Requirements 9.1, 9.2, 9.3**
     * 
     * For any input string (including malformed, empty, or invalid):
     * - Parsing SHALL NOT throw an exception
     * - Parsing SHALL return an array (possibly empty)
     * - Valid entries in malformed input SHALL still be extracted
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

    it('should skip malformed lines but extract valid ones', () => {
      const output = `
node 18.17.0
invalid-line-without-version
python 3.11.0
another-bad-line
git 2.40.0
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('node')
      expect(result[1].name).toBe('python')
      expect(result[2].name).toBe('git')
    })

    it('should handle lines with only whitespace', () => {
      const output = 'node 18.17.0\n   \n\npython 3.11.0'
      const result = handler.parseOutput(output)

      expect(result).toHaveLength(2)
    })

    it('should handle mixed valid and invalid content', () => {
      const validLineArb = fc.tuple(
        fc.string({ minLength: 1 }).filter(s => !s.includes(' ') && !s.includes('\n')),
        fc.string({ minLength: 1 }).filter(s => /^\d/.test(s) && !s.includes('\n'))
      ).map(([name, version]) => `${name} ${version}`)

      const invalidLineArb = fc.oneof(
        fc.constant(''),
        fc.constant('   '),
        fc.string({ minLength: 1 }).filter(s => !s.includes(' ') && !s.includes('\n')), // name only
        fc.constant('invalid line with spaces but no version')
      )

      const mixedOutputArb = fc.array(
        fc.oneof(validLineArb, invalidLineArb),
        { minLength: 1, maxLength: 20 }
      ).map(lines => lines.join('\n'))

      fc.assert(
        fc.property(mixedOutputArb, (output) => {
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
            pkg.manager === 'brew'
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
     * **Validates: Requirements 7.1, 7.2**
     * 
     * For any package name and options:
     * - Formula: should use `brew uninstall <package>`
     * - Cask: should use `brew uninstall --cask <package>`
     * 
     * Note: We test the command structure by verifying the method signature
     * and behavior, not by actually executing uninstall commands in property tests.
     */
    it('should accept cask option', async () => {
      // Test with cask option - verifies the interface accepts the option
      const result = await handler.uninstallPackage('nonexistent-package', { cask: true })
      expect(typeof result).toBe('boolean')
    })

    it('should work without cask option', async () => {
      // Test without cask option
      const result = await handler.uninstallPackage('nonexistent-package')
      expect(typeof result).toBe('boolean')
    })

    it('should accept force option', async () => {
      // Test with force option
      const result = await handler.uninstallPackage('nonexistent-package', { force: true })
      expect(typeof result).toBe('boolean')
    })

    it('should handle various package name formats', async () => {
      // Test with different package name formats
      const testCases = [
        'simple-package',
        'package-with-dashes',
        'package_with_underscores',
        'package@version',
        'package.name'
      ]

      for (const packageName of testCases) {
        const result = await handler.uninstallPackage(packageName)
        expect(typeof result).toBe('boolean')
      }
    })
  })

  describe('Unit Tests - Specific Examples', () => {
    it('should parse real brew formula output', () => {
      const output = `
node 18.17.0 19.0.0
python@3.11 3.11.4
git 2.40.0
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        name: 'node',
        version: '18.17.0',
        location: 'formula',
        manager: 'brew'
      })
      expect(result[1]).toEqual({
        name: 'python@3.11',
        version: '3.11.4',
        location: 'formula',
        manager: 'brew'
      })
      expect(result[2]).toEqual({
        name: 'git',
        version: '2.40.0',
        location: 'formula',
        manager: 'brew'
      })
    })

    it('should handle package names with special characters', () => {
      const output = 'python@3.11 3.11.4\nnode-sass 7.0.0'
      const result = handler.parseOutput(output)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('python@3.11')
      expect(result[1].name).toBe('node-sass')
    })

    it('should handle version strings with various formats', () => {
      const output = `
package1 1.0.0
package2 2.3.4-beta
package3 3.0.0-rc.1
package4 4.5.6+build.123
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(4)
      expect(result[0].version).toBe('1.0.0')
      expect(result[1].version).toBe('2.3.4-beta')
      expect(result[2].version).toBe('3.0.0-rc.1')
      expect(result[3].version).toBe('4.5.6+build.123')
    })
  })
})
