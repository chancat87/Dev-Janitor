/**
 * Dev Janitor - Path Cache
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
 * Path Cache
 * Session-level cache to avoid repeated path searches
 * Validates: Requirements 12.3, 13.2
 */
export class PathCache {
  private paths: Map<string, string | null>
  private availability: Map<string, boolean>
  private timestamps: Map<string, number>
  private ttl: number // Cache time-to-live in milliseconds

  /**
   * Create a new PathCache instance
   * @param ttl Cache time-to-live in milliseconds (default: Infinity for session-level cache)
   */
  constructor(ttl: number = Infinity) {
    this.paths = new Map()
    this.availability = new Map()
    this.timestamps = new Map()
    this.ttl = ttl
  }

  /**
   * Get cached path for a package manager
   * Validates: Requirement 12.3
   * @param manager Package manager identifier
   * @returns Cached path, null if not found, or undefined if not cached
   */
  getPath(manager: string): string | null | undefined {
    if (!this.paths.has(manager)) {
      return undefined
    }

    // Check if cache entry has expired
    if (this.isExpired(manager)) {
      this.invalidate(manager)
      return undefined
    }

    return this.paths.get(manager)
  }

  /**
   * Set path cache for a package manager
   * Validates: Requirement 13.2
   * @param manager Package manager identifier
   * @param path Path to the package manager executable (null if not found)
   */
  setPath(manager: string, path: string | null): void {
    this.paths.set(manager, path)
    this.timestamps.set(manager, Date.now())
  }

  /**
   * Get availability status for a package manager
   * Validates: Requirement 12.3
   * @param manager Package manager identifier
   * @returns Availability status, or undefined if not cached
   */
  getAvailability(manager: string): boolean | undefined {
    if (!this.availability.has(manager)) {
      return undefined
    }

    // Check if cache entry has expired
    if (this.isExpired(manager)) {
      this.invalidate(manager)
      return undefined
    }

    return this.availability.get(manager)
  }

  /**
   * Set availability status for a package manager
   * Validates: Requirement 13.2
   * @param manager Package manager identifier
   * @param available Whether the package manager is available
   */
  setAvailability(manager: string, available: boolean): void {
    this.availability.set(manager, available)
    this.timestamps.set(manager, Date.now())
  }

  /**
   * Check if a cache entry has expired
   * @param manager Package manager identifier
   * @returns true if expired, false otherwise
   */
  private isExpired(manager: string): boolean {
    if (this.ttl === Infinity) {
      return false
    }

    const timestamp = this.timestamps.get(manager)
    if (timestamp === undefined) {
      return true
    }

    return Date.now() - timestamp > this.ttl
  }

  /**
   * Invalidate cache entry for a specific package manager
   * @param manager Package manager identifier
   */
  invalidate(manager: string): void {
    this.paths.delete(manager)
    this.availability.delete(manager)
    this.timestamps.delete(manager)
  }

  /**
   * Clear all cache entries
   * Validates: Requirement 13.2
   */
  clear(): void {
    this.paths.clear()
    this.availability.clear()
    this.timestamps.clear()
  }

  /**
   * Get the number of cached entries
   * @returns Number of cached package managers
   */
  size(): number {
    return this.paths.size
  }

  /**
   * Check if a package manager is cached
   * @param manager Package manager identifier
   * @returns true if cached and not expired, false otherwise
   */
  has(manager: string): boolean {
    return this.paths.has(manager) && !this.isExpired(manager)
  }

  /**
   * Get all cached manager identifiers
   * @returns Array of cached package manager identifiers
   */
  getCachedManagers(): string[] {
    const managers: string[] = []
    for (const manager of this.paths.keys()) {
      if (!this.isExpired(manager)) {
        managers.push(manager)
      }
    }
    return managers
  }
}
