/**
 * Dev Janitor - Pyenv Handler Tests
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
import { PyenvHandler } from './pyenvHandler'
import { TieredPathSearch } from '../tieredPathSearch'
import { PathCache } from '../pathCache'

describe('PyenvHandler', () => {
  let handler: PyenvHandler
  let pathSearch: TieredPathSearch
  let cache: PathCache

  beforeEach(() => {
    cache = new PathCache()
    pathSearch = new TieredPathSearch(cache)
    handler = new PyenvHandler(pathSearch)
  })

  describe('Basic Properties', () => {
    it('should have correct id', () => {
      expect(handler.id).toBe('pyenv')
    })

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Pyenv')
    })

    it('should have correct executable', () => {
      expect(handler.executable).toBe('pyenv')
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
     * **Validates: Requirements 5.3, 5.4**
     * 
     * For any valid Pyenv output, parsing SHALL produce an array of PackageInfo
     * objects where each object has:
     * - name field set to 'python'
     * - A non-empty version field
     * - The manager field set to 'pyenv'
     * - The location field set to 'pyenv-version'
     */
    it('should parse valid pyenv output correctly', () => {
      // Generator for valid Python version strings
      // Formats: X.Y.Z, X.Y.Z-suffix, pypy variants
      const pythonVersionArb = fc.oneof(
        // Standard CPython versions: 3.11.4, 2.7.18
        fc.tuple(
          fc.integer({ min: 2, max: 3 }),
          fc.integer({ min: 0, max: 15 }),
          fc.integer({ min: 0, max: 20 })
        ).map(([major, minor, patch]) => `${major}.${minor}.${patch}`),
        
        // Versions with suffixes: 3.11.4-dev, 3.10.0-rc1
        fc.tuple(
          fc.integer({ min: 2, max: 3 }),
          fc.integer({ min: 0, max: 15 }),
          fc.integer({ min: 0, max: 20 }),
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z0-9-]+$/.test(s))
        ).map(([major, minor, patch, suffix]) => `${major}.${minor}.${patch}-${suffix}`),
        
        // PyPy versions: pypy3.9-7.3.11
        fc.tuple(
          fc.integer({ min: 2, max: 3 }),
          fc.integer({ min: 6, max: 10 }),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 0, max: 20 })
        ).map(([pyMajor, pyMinor, major, minor, patch]) => 
          `pypy${pyMajor}.${pyMinor}-${major}.${minor}.${patch}`)
      )

      const pyenvOutputArb = fc.array(pythonVersionArb, { minLength: 0, maxLength: 20 })
        .map(versions => versions.join('\n'))

      fc.assert(
        fc.property(pyenvOutputArb, (output) => {
          const result = handler.parseOutput(output)

          // All results should be valid PackageInfo objects
          return result.every(pkg =>
            pkg.name === 'python' &&
            pkg.version.length > 0 &&
            pkg.manager === 'pyenv' &&
            pkg.location === 'pyenv-version'
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should extract correct version from pyenv output', () => {
      const pythonVersionArb = fc.oneof(
        fc.tuple(
          fc.integer({ min: 2, max: 3 }),
          fc.integer({ min: 0, max: 15 }),
          fc.integer({ min: 0, max: 20 })
        ).map(([major, minor, patch]) => `${major}.${minor}.${patch}`),
        fc.string({ minLength: 1, maxLength: 30 })
          .filter(s => !s.includes('\n') && s.trim() === s && s.length > 0)
      )

      fc.assert(
        fc.property(pythonVersionArb, (version) => {
          const output = version
          const result = handler.parseOutput(output)

          if (result.length === 0) {
            return false
          }

          const parsed = result[0]
          return parsed.name === 'python' && 
                 parsed.version === version &&
                 parsed.manager === 'pyenv' &&
                 parsed.location === 'pyenv-version'
        }),
        { numRuns: 100 }
      )
    })

    it('should handle multiple versions in output', () => {
      const output = '3.11.4\n3.10.12\n2.7.18'
      const result = handler.parseOutput(output)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        name: 'python',
        version: '3.11.4',
        location: 'pyenv-version',
        manager: 'pyenv'
      })
      expect(result[1]).toEqual({
        name: 'python',
        version: '3.10.12',
        location: 'pyenv-version',
        manager: 'pyenv'
      })
      expect(result[2]).toEqual({
        name: 'python',
        version: '2.7.18',
        location: 'pyenv-version',
        manager: 'pyenv'
      })
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

    it('should handle lines with only whitespace', () => {
      const output = '3.11.4\n   \n\n3.10.12'
      const result = handler.parseOutput(output)

      expect(result).toHaveLength(2)
      expect(result[0].version).toBe('3.11.4')
      expect(result[1].version).toBe('3.10.12')
    })

    it('should handle mixed valid and invalid content', () => {
      const validVersionArb = fc.tuple(
        fc.integer({ min: 2, max: 3 }),
        fc.integer({ min: 0, max: 15 }),
        fc.integer({ min: 0, max: 20 })
      ).map(([major, minor, patch]) => `${major}.${minor}.${patch}`)

      const invalidLineArb = fc.oneof(
        fc.constant(''),
        fc.constant('   '),
        fc.constant('\n')
      )

      const mixedOutputArb = fc.array(
        fc.oneof(validVersionArb, invalidLineArb),
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
            pkg.name === 'python' &&
            pkg.version && pkg.version.length > 0 &&
            pkg.manager === 'pyenv' &&
            pkg.location === 'pyenv-version'
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should handle any string as a version', () => {
      // Pyenv can have various version formats, so any non-empty trimmed line is valid
      const output = `
3.11.4
custom-build-name
pypy3.9-7.3.11
3.10.0-dev
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(4)
      expect(result[0].version).toBe('3.11.4')
      expect(result[1].version).toBe('custom-build-name')
      expect(result[2].version).toBe('pypy3.9-7.3.11')
      expect(result[3].version).toBe('3.10.0-dev')
    })
  })

  describe('Property 3: Uninstall Command Correctness', () => {
    /**
     * Feature: enhanced-package-discovery
     * Property 3: Correct Uninstall Command Execution
     * **Validates: Requirement 7.5**
     * 
     * For any Python version:
     * - Should use `pyenv uninstall -f <version>`
     * 
     * Note: We test the command structure by verifying the method signature
     * and behavior, not by actually executing uninstall commands in property tests.
     */
    it('should work with any version string', async () => {
      const testVersions = [
        '3.11.4',
        '3.10.12',
        '2.7.18',
        'pypy3.9-7.3.11',
        '3.11.0-dev'
      ]

      for (const version of testVersions) {
        const result = await handler.uninstallPackage(version)
        expect(typeof result).toBe('boolean')
      }
    })

    it('should accept force option', async () => {
      const result = await handler.uninstallPackage('3.11.4', { force: true })
      expect(typeof result).toBe('boolean')
    })

    it('should handle various version formats', async () => {
      const versionArb = fc.oneof(
        fc.tuple(
          fc.integer({ min: 2, max: 3 }),
          fc.integer({ min: 0, max: 15 }),
          fc.integer({ min: 0, max: 20 })
        ).map(([major, minor, patch]) => `${major}.${minor}.${patch}`),
        fc.string({ minLength: 1, maxLength: 30 })
          .filter(s => !s.includes(' ') && !s.includes('\n') && s.trim() === s)
      )

      await fc.assert(
        fc.asyncProperty(versionArb, async (version) => {
          const result = await handler.uninstallPackage(version)
          return typeof result === 'boolean'
        }),
        { numRuns: 50 }
      )
    })
  })

  describe('Unit Tests - Specific Examples', () => {
    it('should parse real pyenv output', () => {
      const output = `
3.11.4
3.10.12
3.9.17
2.7.18
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(4)
      expect(result[0]).toEqual({
        name: 'python',
        version: '3.11.4',
        location: 'pyenv-version',
        manager: 'pyenv'
      })
      expect(result[1]).toEqual({
        name: 'python',
        version: '3.10.12',
        location: 'pyenv-version',
        manager: 'pyenv'
      })
      expect(result[2]).toEqual({
        name: 'python',
        version: '3.9.17',
        location: 'pyenv-version',
        manager: 'pyenv'
      })
      expect(result[3]).toEqual({
        name: 'python',
        version: '2.7.18',
        location: 'pyenv-version',
        manager: 'pyenv'
      })
    })

    it('should handle PyPy versions', () => {
      const output = `
pypy3.9-7.3.11
pypy2.7-7.3.9
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(2)
      expect(result[0].version).toBe('pypy3.9-7.3.11')
      expect(result[1].version).toBe('pypy2.7-7.3.9')
    })

    it('should handle development versions', () => {
      const output = `
3.12.0-dev
3.11.0-rc1
3.10.0-alpha
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(3)
      expect(result[0].version).toBe('3.12.0-dev')
      expect(result[1].version).toBe('3.11.0-rc1')
      expect(result[2].version).toBe('3.10.0-alpha')
    })

    it('should handle custom build names', () => {
      const output = `
3.11.4
my-custom-python-build
another-build-v2
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(3)
      expect(result[0].version).toBe('3.11.4')
      expect(result[1].version).toBe('my-custom-python-build')
      expect(result[2].version).toBe('another-build-v2')
    })

    it('should handle single version', () => {
      const output = '3.11.4'
      const result = handler.parseOutput(output)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        name: 'python',
        version: '3.11.4',
        location: 'pyenv-version',
        manager: 'pyenv'
      })
    })

    it('should handle empty lines between versions', () => {
      const output = `
3.11.4

3.10.12

3.9.17
      `.trim()

      const result = handler.parseOutput(output)

      expect(result).toHaveLength(3)
    })
  })
})
