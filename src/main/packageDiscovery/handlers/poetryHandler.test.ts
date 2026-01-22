/**
 * Dev Janitor - Poetry Handler Tests
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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PoetryHandler } from './poetryHandler'
import { TieredPathSearch } from '../tieredPathSearch'
import { PathCache } from '../pathCache'
import * as commandExecutor from '../../commandExecutor'
import * as fs from 'fs/promises'
import * as os from 'os'

// Mock dependencies
vi.mock('../../commandExecutor')
vi.mock('fs/promises')
vi.mock('os')

describe('PoetryHandler', () => {
  let handler: PoetryHandler
  let mockPathSearch: TieredPathSearch

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock path search
    mockPathSearch = new TieredPathSearch(new PathCache())
    handler = new PoetryHandler(mockPathSearch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkAvailability', () => {
    it('should return true when poetry is found', async () => {
      // Mock findExecutable to return a path
      vi.spyOn(mockPathSearch, 'findExecutable').mockResolvedValue({
        path: '/usr/local/bin/poetry',
        method: 'direct_command',
        inPath: true
      })

      const result = await handler.checkAvailability()

      expect(result).toBe(true)
      expect(mockPathSearch.findExecutable).toHaveBeenCalledWith(
        'poetry',
        handler.commonPaths
      )
    })

    it('should return false when poetry is not found', async () => {
      // Mock findExecutable to return null
      vi.spyOn(mockPathSearch, 'findExecutable').mockResolvedValue(null)

      const result = await handler.checkAvailability()

      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      // Mock findExecutable to throw an error
      vi.spyOn(mockPathSearch, 'findExecutable').mockRejectedValue(
        new Error('Search failed')
      )

      await expect(handler.checkAvailability()).rejects.toThrow('Search failed')
    })
  })

  describe('listPackages', () => {
    it('should return empty array when poetry data dir command fails', async () => {
      // Mock executeSafe to fail
      vi.mocked(commandExecutor.executeSafe).mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Command failed',
        exitCode: 1
      })

      // Mock default data dir
      vi.mocked(os.homedir).mockReturnValue('/home/user')
      vi.mocked(os.platform).mockReturnValue('linux')

      // Mock fs.access to fail (directory doesn't exist)
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory not found'))

      const result = await handler.listPackages()

      expect(result).toEqual([])
    })

    it('should scan poetry data directory and return packages', async () => {
      // Mock executeSafe to return data dir
      vi.mocked(commandExecutor.executeSafe).mockResolvedValue({
        success: true,
        stdout: '/home/user/.local/share/pypoetry',
        stderr: '',
        exitCode: 0
      })

      // Mock fs.access to succeed
      vi.mocked(fs.access).mockResolvedValue(undefined)

      // Mock fs.readdir to return virtualenv directories
      vi.mocked(fs.readdir).mockResolvedValueOnce([
        { name: 'myproject-a1b2c3d4-py3.11', isDirectory: () => true } as any,
        { name: 'another-project-e5f6g7h8-py3.10', isDirectory: () => true } as any
      ] as any)

      // Mock readdir for site-packages (first call for lib, second for site-packages)
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['python3.11'] as any)
        .mockResolvedValueOnce(['myproject-1.0.0.dist-info'] as any)
        .mockResolvedValueOnce(['python3.10'] as any)
        .mockResolvedValueOnce(['another_project-2.0.0.dist-info'] as any)

      const result = await handler.listPackages()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        name: 'myproject',
        version: '1.0.0',
        location: 'poetry-env',
        manager: 'poetry',
        environment: 'myproject-a1b2c3d4-py3.11'
      })
      expect(result[1]).toMatchObject({
        name: 'another-project',
        version: '2.0.0',
        location: 'poetry-env',
        manager: 'poetry',
        environment: 'another-project-e5f6g7h8-py3.10'
      })
    })

    it('should handle virtualenvs without version info', async () => {
      // Mock executeSafe to return data dir
      vi.mocked(commandExecutor.executeSafe).mockResolvedValue({
        success: true,
        stdout: '/home/user/.local/share/pypoetry',
        stderr: '',
        exitCode: 0
      })

      // Mock fs.access to succeed
      vi.mocked(fs.access).mockResolvedValue(undefined)

      // Mock fs.readdir to return virtualenv directories
      vi.mocked(fs.readdir).mockResolvedValueOnce([
        { name: 'myproject-a1b2c3d4-py3.11', isDirectory: () => true } as any
      ] as any)

      // Mock readdir for site-packages to fail
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['python3.11'] as any)
        .mockResolvedValueOnce([] as any) // No dist-info found

      const result = await handler.listPackages()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'myproject',
        version: 'unknown',
        location: 'poetry-env',
        manager: 'poetry'
      })
    })

    it('should skip malformed virtualenv directory names', async () => {
      // Mock executeSafe to return data dir
      vi.mocked(commandExecutor.executeSafe).mockResolvedValue({
        success: true,
        stdout: '/home/user/.local/share/pypoetry',
        stderr: '',
        exitCode: 0
      })

      // Mock fs.access to succeed
      vi.mocked(fs.access).mockResolvedValue(undefined)

      // Mock fs.readdir to return virtualenv directories with malformed names
      // "invalid" has only 1 part
      // "two-parts" has only 2 parts
      // "valid-a1b2c3d4-py3.11" has 3 parts and is valid
      vi.mocked(fs.readdir).mockResolvedValueOnce([
        { name: 'invalid', isDirectory: () => true } as any,
        { name: 'two-parts', isDirectory: () => true } as any,
        { name: 'valid-a1b2c3d4-py3.11', isDirectory: () => true } as any
      ] as any)

      // Mock readdir for the valid virtualenv
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['python3.11'] as any)
        .mockResolvedValueOnce(['valid-1.0.0.dist-info'] as any)

      const result = await handler.listPackages()

      // Should only return the valid one
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('valid')
    })

    it('should handle Windows paths correctly', async () => {
      // Mock executeSafe to return data dir
      vi.mocked(commandExecutor.executeSafe).mockResolvedValue({
        success: true,
        stdout: 'C:\\Users\\user\\AppData\\Roaming\\pypoetry',
        stderr: '',
        exitCode: 0
      })

      // Mock platform as Windows
      vi.mocked(os.platform).mockReturnValue('win32')

      // Mock fs.access to succeed
      vi.mocked(fs.access).mockResolvedValue(undefined)

      // Mock fs.readdir to return virtualenv directories
      vi.mocked(fs.readdir).mockResolvedValueOnce([
        { name: 'myproject-a1b2c3d4-py3.11', isDirectory: () => true } as any
      ] as any)

      // Mock readdir for site-packages (Windows uses Lib instead of lib)
      vi.mocked(fs.readdir).mockResolvedValueOnce(['myproject-1.0.0.dist-info'] as any)

      const result = await handler.listPackages()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'myproject',
        version: '1.0.0',
        location: 'poetry-env',
        manager: 'poetry'
      })
    })

    it('should use default data dir on macOS when command fails', async () => {
      // Mock executeSafe to fail
      vi.mocked(commandExecutor.executeSafe).mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Command failed',
        exitCode: 1
      })

      // Mock platform as macOS
      vi.mocked(os.platform).mockReturnValue('darwin')
      vi.mocked(os.homedir).mockReturnValue('/Users/user')

      // Mock fs.access to fail (directory doesn't exist)
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory not found'))

      const result = await handler.listPackages()

      expect(result).toEqual([])
      // Verify it tried to access the macOS default path
      const accessCall = vi.mocked(fs.access).mock.calls[0][0] as string
      expect(accessCall).toContain('Library')
      expect(accessCall).toContain('Application Support')
      expect(accessCall).toContain('pypoetry')
      expect(accessCall).toContain('virtualenvs')
    })
  })

  describe('uninstallPackage', () => {
    it('should return false as Poetry does not support global uninstall', async () => {
      const result = await handler.uninstallPackage('myproject')

      expect(result).toBe(false)
    })
  })

  describe('parseOutput', () => {
    it('should return empty array as Poetry uses directory scanning', () => {
      const result = handler.parseOutput('any output')

      expect(result).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('should handle empty virtualenvs directory', async () => {
      // Mock executeSafe to return data dir
      vi.mocked(commandExecutor.executeSafe).mockResolvedValue({
        success: true,
        stdout: '/home/user/.local/share/pypoetry',
        stderr: '',
        exitCode: 0
      })

      // Mock fs.access to succeed
      vi.mocked(fs.access).mockResolvedValue(undefined)

      // Mock fs.readdir to return empty array
      vi.mocked(fs.readdir).mockResolvedValueOnce([] as any)

      const result = await handler.listPackages()

      expect(result).toEqual([])
    })

    it('should handle file entries in virtualenvs directory', async () => {
      // Mock executeSafe to return data dir
      vi.mocked(commandExecutor.executeSafe).mockResolvedValue({
        success: true,
        stdout: '/home/user/.local/share/pypoetry',
        stderr: '',
        exitCode: 0
      })

      // Mock fs.access to succeed
      vi.mocked(fs.access).mockResolvedValue(undefined)

      // Mock fs.readdir to return mix of files and directories
      vi.mocked(fs.readdir).mockResolvedValueOnce([
        { name: 'somefile.txt', isDirectory: () => false } as any,
        { name: 'myproject-a1b2c3d4-py3.11', isDirectory: () => true } as any
      ] as any)

      // Mock readdir for the valid virtualenv
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['python3.11'] as any)
        .mockResolvedValueOnce(['myproject-1.0.0.dist-info'] as any)

      const result = await handler.listPackages()

      // Should only process the directory
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('myproject')
    })

    it('should handle package names with hyphens correctly', async () => {
      // Mock executeSafe to return data dir
      vi.mocked(commandExecutor.executeSafe).mockResolvedValue({
        success: true,
        stdout: '/home/user/.local/share/pypoetry',
        stderr: '',
        exitCode: 0
      })

      // Mock fs.access to succeed
      vi.mocked(fs.access).mockResolvedValue(undefined)

      // Mock fs.readdir with package name containing hyphens
      vi.mocked(fs.readdir).mockResolvedValueOnce([
        { name: 'my-cool-project-a1b2c3d4-py3.11', isDirectory: () => true } as any
      ] as any)

      // Mock readdir for site-packages
      vi.mocked(fs.readdir)
        .mockResolvedValueOnce(['python3.11'] as any)
        .mockResolvedValueOnce(['my_cool_project-1.0.0.dist-info'] as any)

      const result = await handler.listPackages()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'my-cool-project',
        version: '1.0.0'
      })
    })
  })
})
