/**
 * Tests for PathCache
 * 
 * Feature: enhanced-package-discovery
 * Tests Property 5: Path Caching Correctness
 * Validates: Requirements 12.3, 13.2
 */

import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { PathCache } from './pathCache'

describe('PathCache', () => {
  let cache: PathCache

  beforeEach(() => {
    cache = new PathCache()
  })

  describe('Basic Operations', () => {
    it('should return undefined for uncached paths', () => {
      expect(cache.getPath('npm')).toBeUndefined()
      expect(cache.getAvailability('npm')).toBeUndefined()
    })

    it('should store and retrieve paths', () => {
      cache.setPath('npm', '/usr/local/bin/npm')
      expect(cache.getPath('npm')).toBe('/usr/local/bin/npm')
    })

    it('should store and retrieve null paths', () => {
      cache.setPath('brew', null)
      expect(cache.getPath('brew')).toBeNull()
    })

    it('should store and retrieve availability status', () => {
      cache.setAvailability('pip', true)
      expect(cache.getAvailability('pip')).toBe(true)

      cache.setAvailability('conda', false)
      expect(cache.getAvailability('conda')).toBe(false)
    })

    it('should clear all cache entries', () => {
      cache.setPath('npm', '/usr/local/bin/npm')
      cache.setPath('pip', '/usr/bin/pip')
      cache.setAvailability('npm', true)
      
      cache.clear()
      
      expect(cache.getPath('npm')).toBeUndefined()
      expect(cache.getPath('pip')).toBeUndefined()
      expect(cache.getAvailability('npm')).toBeUndefined()
      expect(cache.size()).toBe(0)
    })

    it('should invalidate specific cache entry', () => {
      cache.setPath('npm', '/usr/local/bin/npm')
      cache.setPath('pip', '/usr/bin/pip')
      cache.setAvailability('npm', true)
      
      cache.invalidate('npm')
      
      expect(cache.getPath('npm')).toBeUndefined()
      expect(cache.getAvailability('npm')).toBeUndefined()
      expect(cache.getPath('pip')).toBe('/usr/bin/pip')
    })

    it('should report correct size', () => {
      expect(cache.size()).toBe(0)
      
      cache.setPath('npm', '/usr/local/bin/npm')
      expect(cache.size()).toBe(1)
      
      cache.setPath('pip', '/usr/bin/pip')
      expect(cache.size()).toBe(2)
      
      cache.clear()
      expect(cache.size()).toBe(0)
    })

    it('should check if manager is cached', () => {
      expect(cache.has('npm')).toBe(false)
      
      cache.setPath('npm', '/usr/local/bin/npm')
      expect(cache.has('npm')).toBe(true)
      
      cache.invalidate('npm')
      expect(cache.has('npm')).toBe(false)
    })

    it('should get all cached managers', () => {
      cache.setPath('npm', '/usr/local/bin/npm')
      cache.setPath('pip', '/usr/bin/pip')
      cache.setPath('brew', '/opt/homebrew/bin/brew')
      
      const managers = cache.getCachedManagers()
      expect(managers).toHaveLength(3)
      expect(managers).toContain('npm')
      expect(managers).toContain('pip')
      expect(managers).toContain('brew')
    })
  })

  describe('TTL (Time-To-Live)', () => {
    it('should respect TTL for path cache', async () => {
      const shortCache = new PathCache(100) // 100ms TTL
      
      shortCache.setPath('npm', '/usr/local/bin/npm')
      expect(shortCache.getPath('npm')).toBe('/usr/local/bin/npm')
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(shortCache.getPath('npm')).toBeUndefined()
    })

    it('should respect TTL for availability cache', async () => {
      const shortCache = new PathCache(100) // 100ms TTL
      
      shortCache.setAvailability('npm', true)
      expect(shortCache.getAvailability('npm')).toBe(true)
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(shortCache.getAvailability('npm')).toBeUndefined()
    })

    it('should not expire with infinite TTL', async () => {
      cache.setPath('npm', '/usr/local/bin/npm')
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should still be cached
      expect(cache.getPath('npm')).toBe('/usr/local/bin/npm')
    })

    it('should update timestamp on re-set', async () => {
      const shortCache = new PathCache(200) // 200ms TTL
      
      shortCache.setPath('npm', '/usr/local/bin/npm')
      
      // Wait 100ms
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Re-set the path (updates timestamp)
      shortCache.setPath('npm', '/usr/local/bin/npm')
      
      // Wait another 100ms (total 200ms from first set, but only 100ms from re-set)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should still be cached because timestamp was updated
      expect(shortCache.getPath('npm')).toBe('/usr/local/bin/npm')
    })
  })

  describe('Property 5: Path Caching Correctness', () => {
    /**
     * Feature: enhanced-package-discovery
     * Property 5: Path Caching Correctness
     * **Validates: Requirements 12.3, 13.2**
     * 
     * For any package manager, once a path is discovered:
     * - Subsequent lookups SHALL return the cached path without re-executing search
     * - The cache SHALL persist for the duration of the application session
     */
    it('Property 5: cached paths should be returned consistently', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              manager: fc.constantFrom('npm', 'pip', 'brew', 'conda', 'pipx', 'poetry', 'pyenv', 'composer', 'cargo', 'gem'),
              path: fc.oneof(
                fc.constant(null),
                fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.includes('/') || s.includes('\\')),
              ),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (entries) => {
            const testCache = new PathCache()
            
            // Create a map to track the last value for each manager (last write wins)
            const expectedPaths = new Map<string, string | null>()
            
            // Set all paths
            for (const entry of entries) {
              testCache.setPath(entry.manager, entry.path)
              expectedPaths.set(entry.manager, entry.path)
            }
            
            // Verify all paths are cached correctly (using last written value)
            for (const [manager, expectedPath] of expectedPaths) {
              const cachedPath = testCache.getPath(manager)
              if (cachedPath !== expectedPath) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5: cached availability should be returned consistently', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              manager: fc.constantFrom('npm', 'pip', 'brew', 'conda', 'pipx', 'poetry', 'pyenv'),
              available: fc.boolean(),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (entries) => {
            const testCache = new PathCache()
            
            // Create a map to track the last value for each manager (last write wins)
            const expectedAvailability = new Map<string, boolean>()
            
            // Set all availability statuses
            for (const entry of entries) {
              testCache.setAvailability(entry.manager, entry.available)
              expectedAvailability.set(entry.manager, entry.available)
            }
            
            // Verify all statuses are cached correctly (using last written value)
            for (const [manager, expectedStatus] of expectedAvailability) {
              const cachedAvailability = testCache.getAvailability(manager)
              if (cachedAvailability !== expectedStatus) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5: cache should persist across multiple lookups', () => {
      fc.assert(
        fc.property(
          fc.record({
            manager: fc.constantFrom('npm', 'pip', 'brew', 'conda', 'pipx'),
            path: fc.string({ minLength: 1, maxLength: 100 }),
            lookupCount: fc.integer({ min: 1, max: 100 }),
          }),
          ({ manager, path, lookupCount }) => {
            const testCache = new PathCache()
            testCache.setPath(manager, path)
            
            // Perform multiple lookups
            for (let i = 0; i < lookupCount; i++) {
              const cachedPath = testCache.getPath(manager)
              if (cachedPath !== path) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5: cache should handle concurrent operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              manager: fc.constantFrom('npm', 'pip', 'brew', 'conda', 'pipx', 'poetry', 'pyenv'),
              path: fc.string({ minLength: 1, maxLength: 50 }),
              available: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (entries) => {
            const testCache = new PathCache()
            
            // Create maps to track the last value for each manager (last write wins)
            const expectedPaths = new Map<string, string>()
            const expectedAvailability = new Map<string, boolean>()
            
            // Set paths and availability in interleaved manner
            for (const entry of entries) {
              testCache.setPath(entry.manager, entry.path)
              testCache.setAvailability(entry.manager, entry.available)
              expectedPaths.set(entry.manager, entry.path)
              expectedAvailability.set(entry.manager, entry.available)
            }
            
            // Verify all entries are correct (using last written values)
            for (const [manager, expectedPath] of expectedPaths) {
              const cachedPath = testCache.getPath(manager)
              const cachedAvailability = testCache.getAvailability(manager)
              const expectedStatus = expectedAvailability.get(manager)
              
              if (cachedPath !== expectedPath || cachedAvailability !== expectedStatus) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5: invalidation should not affect other entries', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              manager: fc.constantFrom('npm', 'pip', 'brew', 'conda', 'pipx', 'poetry', 'pyenv'),
              path: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          fc.integer({ min: 0, max: 9 }),
          (entries, invalidateIndex) => {
            // Get unique managers only (last write wins)
            const uniqueEntries = new Map<string, string>()
            for (const entry of entries) {
              uniqueEntries.set(entry.manager, entry.path)
            }
            
            const uniqueArray = Array.from(uniqueEntries.entries()).map(([manager, path]) => ({ manager, path }))
            
            if (uniqueArray.length < 2 || invalidateIndex >= uniqueArray.length) {
              return true // Skip if not enough unique entries or index out of bounds
            }
            
            const testCache = new PathCache()
            
            // Set all paths
            for (const entry of uniqueArray) {
              testCache.setPath(entry.manager, entry.path)
            }
            
            // Invalidate one entry
            const invalidatedManager = uniqueArray[invalidateIndex].manager
            testCache.invalidate(invalidatedManager)
            
            // Verify invalidated entry is gone
            if (testCache.getPath(invalidatedManager) !== undefined) {
              return false
            }
            
            // Verify other entries are still cached
            for (let i = 0; i < uniqueArray.length; i++) {
              if (i !== invalidateIndex) {
                const entry = uniqueArray[i]
                const cachedPath = testCache.getPath(entry.manager)
                if (cachedPath !== entry.path) {
                  return false
                }
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5: clear should remove all entries', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              manager: fc.constantFrom('npm', 'pip', 'brew', 'conda', 'pipx', 'poetry', 'pyenv'),
              path: fc.string({ minLength: 1, maxLength: 50 }),
              available: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (entries) => {
            const testCache = new PathCache()
            
            // Set all entries
            for (const entry of entries) {
              testCache.setPath(entry.manager, entry.path)
              testCache.setAvailability(entry.manager, entry.available)
            }
            
            // Clear cache
            testCache.clear()
            
            // Verify all entries are gone
            for (const entry of entries) {
              if (testCache.getPath(entry.manager) !== undefined ||
                  testCache.getAvailability(entry.manager) !== undefined) {
                return false
              }
            }
            
            return testCache.size() === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5: cache should handle path updates', () => {
      fc.assert(
        fc.property(
          fc.record({
            manager: fc.constantFrom('npm', 'pip', 'brew', 'conda', 'pipx'),
            initialPath: fc.string({ minLength: 1, maxLength: 50 }),
            updatedPath: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          ({ manager, initialPath, updatedPath }) => {
            const testCache = new PathCache()
            
            // Set initial path
            testCache.setPath(manager, initialPath)
            if (testCache.getPath(manager) !== initialPath) {
              return false
            }
            
            // Update path
            testCache.setPath(manager, updatedPath)
            if (testCache.getPath(manager) !== updatedPath) {
              return false
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5: cache should maintain separate path and availability stores', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              manager: fc.constantFrom('npm', 'pip', 'brew', 'conda', 'pipx'),
              path: fc.string({ minLength: 1, maxLength: 50 }),
              available: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (entries) => {
            const testCache = new PathCache()
            
            // Create maps to track the last value for each manager (last write wins)
            const expectedPaths = new Map<string, string>()
            const expectedAvailability = new Map<string, boolean>()
            
            // Set only paths
            for (const entry of entries) {
              testCache.setPath(entry.manager, entry.path)
              expectedPaths.set(entry.manager, entry.path)
              expectedAvailability.set(entry.manager, entry.available)
            }
            
            // Verify paths are set but availability is not
            for (const [manager, expectedPath] of expectedPaths) {
              if (testCache.getPath(manager) !== expectedPath) {
                return false
              }
              if (testCache.getAvailability(manager) !== undefined) {
                return false
              }
            }
            
            // Now set availability
            for (const [manager, available] of expectedAvailability) {
              testCache.setAvailability(manager, available)
            }
            
            // Verify both are set correctly
            for (const [manager, expectedPath] of expectedPaths) {
              const expectedStatus = expectedAvailability.get(manager)
              if (testCache.getPath(manager) !== expectedPath ||
                  testCache.getAvailability(manager) !== expectedStatus) {
                return false
              }
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string manager names', () => {
      cache.setPath('', '/some/path')
      expect(cache.getPath('')).toBe('/some/path')
    })

    it('should handle special characters in manager names', () => {
      cache.setPath('my-manager@1.0', '/path/to/manager')
      expect(cache.getPath('my-manager@1.0')).toBe('/path/to/manager')
    })

    it('should handle very long paths', () => {
      const longPath = '/very/long/path/'.repeat(50)
      cache.setPath('npm', longPath)
      expect(cache.getPath('npm')).toBe(longPath)
    })

    it('should handle multiple sets of the same manager', () => {
      cache.setPath('npm', '/path1')
      cache.setPath('npm', '/path2')
      cache.setPath('npm', '/path3')
      
      expect(cache.getPath('npm')).toBe('/path3')
      expect(cache.size()).toBe(1)
    })

    it('should handle getCachedManagers with expired entries', async () => {
      const shortCache = new PathCache(100)
      
      shortCache.setPath('npm', '/usr/local/bin/npm')
      shortCache.setPath('pip', '/usr/bin/pip')
      
      // Wait for first entry to expire
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Add another entry
      shortCache.setPath('brew', '/opt/homebrew/bin/brew')
      
      const managers = shortCache.getCachedManagers()
      
      // Should only include non-expired entries
      expect(managers).not.toContain('npm')
      expect(managers).not.toContain('pip')
      expect(managers).toContain('brew')
    })
  })
})
