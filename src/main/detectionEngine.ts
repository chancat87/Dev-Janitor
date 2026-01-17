/**
 * Detection Engine Module
 * 
 * Provides functionality to detect installed development tools:
 * - Node.js, Python, PHP (runtimes)
 * - npm, pip, Composer (package managers)
 * - Custom tools via command detection
 * 
 * Validates: Requirements 1.2-1.9
 */

import { ToolInfo } from '../shared/types'
import {
  CommandExecutor,
  commandExecutor,
} from './commandExecutor'

/**
 * Version parsing result
 */
interface ParsedVersion {
  version: string | null
  raw: string
}

/**
 * Parse version string from command output
 * Handles various version formats:
 * - v18.17.0 (Node.js style)
 * - Python 3.11.4
 * - PHP 8.2.0
 * - 9.8.1 (npm style)
 * 
 * @param output The command output to parse
 * @returns Parsed version information
 */
export function parseVersion(output: string): ParsedVersion {
  if (!output || typeof output !== 'string') {
    return { version: null, raw: '' }
  }
  
  const trimmed = output.trim()
  
  // Try to match common version patterns
  // Pattern 1: v followed by semver (v18.17.0)
  const vPattern = /v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)/i
  const match = trimmed.match(vPattern)
  
  if (match) {
    return { version: match[1], raw: trimmed }
  }
  
  // Pattern 2: Just numbers with dots (9.8.1)
  const numPattern = /(\d+\.\d+(?:\.\d+)?)/
  const numMatch = trimmed.match(numPattern)
  
  if (numMatch) {
    return { version: numMatch[1], raw: trimmed }
  }
  
  return { version: null, raw: trimmed }
}

/**
 * Determine the installation method based on the tool path
 * 
 * @param path The installation path of the tool
 * @returns The detected installation method
 */
export function detectInstallMethod(
  path: string | null
): ToolInfo['installMethod'] {
  if (!path) return 'manual'
  
  const lowerPath = path.toLowerCase()
  
  // Check for common package manager installation paths
  if (lowerPath.includes('homebrew') || lowerPath.includes('/opt/homebrew')) {
    return 'homebrew'
  }
  if (lowerPath.includes('chocolatey') || lowerPath.includes('choco')) {
    return 'chocolatey'
  }
  if (lowerPath.includes('/usr/bin') || lowerPath.includes('/usr/local/bin')) {
    // Could be apt or manual on Linux
    if (process.platform === 'linux') {
      return 'apt'
    }
  }
  if (lowerPath.includes('npm') || lowerPath.includes('node_modules')) {
    return 'npm'
  }
  if (lowerPath.includes('pip') || lowerPath.includes('site-packages')) {
    return 'pip'
  }
  
  return 'manual'
}

/**
 * Create a ToolInfo object for an unavailable tool
 * 
 * Property 2: Unavailable Tool Handling
 * @param name Tool name
 * @param displayName Display name
 * @param category Tool category
 * @returns ToolInfo with isInstalled: false
 */
function createUnavailableTool(
  name: string,
  displayName: string,
  category: ToolInfo['category']
): ToolInfo {
  return {
    name,
    displayName,
    version: null,
    path: null,
    isInstalled: false,
    category,
  }
}

/**
 * Detection Engine class for detecting installed development tools
 */
export class DetectionEngine {
  private executor: CommandExecutor
  
  constructor(executor: CommandExecutor = commandExecutor) {
    this.executor = executor
  }
  
  /**
   * Detect Node.js installation
   * 
   * Property 1: Tool Detection Consistency
   * Validates: Requirement 1.2
   */
  async detectNodeJS(): Promise<ToolInfo> {
    const name = 'node'
    const displayName = 'Node.js'
    const category: ToolInfo['category'] = 'runtime'
    
    try {
      // Get version
      const versionResult = await this.executor.executeSafe('node --version')
      
      if (!versionResult.success) {
        return createUnavailableTool(name, displayName, category)
      }
      
      const { version } = parseVersion(versionResult.stdout)
      
      // Get path
      const path = await this.executor.getToolPath('node')
      
      return {
        name,
        displayName,
        version,
        path,
        isInstalled: true,
        installMethod: detectInstallMethod(path),
        category,
      }
    } catch {
      return createUnavailableTool(name, displayName, category)
    }
  }
  
  /**
   * Detect npm installation
   * 
   * Property 1: Tool Detection Consistency
   * Validates: Requirement 1.3
   */
  async detectNpm(): Promise<ToolInfo> {
    const name = 'npm'
    const displayName = 'npm'
    const category: ToolInfo['category'] = 'package-manager'
    
    try {
      const versionResult = await this.executor.executeSafe('npm --version')
      
      if (!versionResult.success) {
        return createUnavailableTool(name, displayName, category)
      }
      
      const { version } = parseVersion(versionResult.stdout)
      const path = await this.executor.getToolPath('npm')
      
      return {
        name,
        displayName,
        version,
        path,
        isInstalled: true,
        installMethod: detectInstallMethod(path),
        category,
      }
    } catch {
      return createUnavailableTool(name, displayName, category)
    }
  }
  
  /**
   * Detect Python installation
   * 
   * Property 1: Tool Detection Consistency
   * Validates: Requirement 1.4
   */
  async detectPython(): Promise<ToolInfo> {
    const name = 'python'
    const displayName = 'Python'
    const category: ToolInfo['category'] = 'runtime'
    
    try {
      // Try different Python commands based on platform
      // Windows: py (Python Launcher), python, python3
      // Unix: python3, python
      const isWindows = process.platform === 'win32'
      const commands = isWindows 
        ? ['py', 'python', 'python3']
        : ['python3', 'python']
      
      let versionResult = { success: false, stdout: '', stderr: '', exitCode: 1 }
      let pythonCmd = ''
      
      for (const cmd of commands) {
        versionResult = await this.executor.executeSafe(`${cmd} --version`)
        if (versionResult.success) {
          pythonCmd = cmd
          break
        }
      }
      
      if (!versionResult.success) {
        return createUnavailableTool(name, displayName, category)
      }
      
      const { version } = parseVersion(versionResult.stdout)
      const path = await this.executor.getToolPath(pythonCmd)
      
      return {
        name,
        displayName,
        version,
        path,
        isInstalled: true,
        installMethod: detectInstallMethod(path),
        category,
      }
    } catch {
      return createUnavailableTool(name, displayName, category)
    }
  }
  
  /**
   * Detect pip installation
   * 
   * Property 1: Tool Detection Consistency
   * Validates: Requirement 1.5
   */
  async detectPip(): Promise<ToolInfo> {
    const name = 'pip'
    const displayName = 'pip'
    const category: ToolInfo['category'] = 'package-manager'
    
    try {
      // Try different pip commands based on platform
      // Windows: pip, pip3, py -m pip
      // Unix: pip3, pip
      const isWindows = process.platform === 'win32'
      const commands = isWindows 
        ? ['pip', 'pip3', 'py -m pip']
        : ['pip3', 'pip']
      
      let versionResult = { success: false, stdout: '', stderr: '', exitCode: 1 }
      let pipCmd = ''
      
      for (const cmd of commands) {
        versionResult = await this.executor.executeSafe(`${cmd} --version`)
        if (versionResult.success) {
          pipCmd = cmd
          break
        }
      }
      
      if (!versionResult.success) {
        return createUnavailableTool(name, displayName, category)
      }
      
      // pip version output: "pip 23.2.1 from /path/to/pip (python 3.11)"
      const { version } = parseVersion(versionResult.stdout)
      
      // For 'py -m pip', get the path of py instead
      const pathCmd = pipCmd === 'py -m pip' ? 'py' : pipCmd
      const path = await this.executor.getToolPath(pathCmd)
      
      return {
        name,
        displayName,
        version,
        path,
        isInstalled: true,
        installMethod: detectInstallMethod(path),
        category,
      }
    } catch {
      return createUnavailableTool(name, displayName, category)
    }
  }
  
  /**
   * Detect PHP installation
   * 
   * Property 1: Tool Detection Consistency
   * Validates: Requirement 1.6
   */
  async detectPHP(): Promise<ToolInfo> {
    const name = 'php'
    const displayName = 'PHP'
    const category: ToolInfo['category'] = 'runtime'
    
    try {
      const versionResult = await this.executor.executeSafe('php --version')
      
      if (!versionResult.success) {
        return createUnavailableTool(name, displayName, category)
      }
      
      // PHP version output: "PHP 8.2.0 (cli) ..."
      const { version } = parseVersion(versionResult.stdout)
      const path = await this.executor.getToolPath('php')
      
      return {
        name,
        displayName,
        version,
        path,
        isInstalled: true,
        installMethod: detectInstallMethod(path),
        category,
      }
    } catch {
      return createUnavailableTool(name, displayName, category)
    }
  }
  
  /**
   * Detect Composer installation
   * 
   * Property 1: Tool Detection Consistency
   * Validates: Requirement 1.7
   */
  async detectComposer(): Promise<ToolInfo> {
    const name = 'composer'
    const displayName = 'Composer'
    const category: ToolInfo['category'] = 'package-manager'
    
    try {
      const versionResult = await this.executor.executeSafe('composer --version')
      
      if (!versionResult.success) {
        return createUnavailableTool(name, displayName, category)
      }
      
      // Composer version output: "Composer version 2.5.8 2023-06-09 17:13:21"
      const { version } = parseVersion(versionResult.stdout)
      const path = await this.executor.getToolPath('composer')
      
      return {
        name,
        displayName,
        version,
        path,
        isInstalled: true,
        installMethod: detectInstallMethod(path),
        category,
      }
    } catch {
      return createUnavailableTool(name, displayName, category)
    }
  }
  
  /**
   * Detect a custom tool by command name
   * 
   * @param command The command name to detect
   * @param displayName Optional display name (defaults to command)
   * @param versionFlag Optional version flag (defaults to --version)
   * @returns Promise resolving to ToolInfo
   */
  async detectCustomTool(
    command: string,
    displayName?: string,
    versionFlag: string = '--version'
  ): Promise<ToolInfo> {
    const name = command
    const display = displayName || command
    const category: ToolInfo['category'] = 'tool'
    
    try {
      const versionResult = await this.executor.executeSafe(
        `${command} ${versionFlag}`
      )
      
      if (!versionResult.success) {
        return createUnavailableTool(name, display, category)
      }
      
      const { version } = parseVersion(versionResult.stdout)
      const path = await this.executor.getToolPath(command)
      
      return {
        name,
        displayName: display,
        version,
        path,
        isInstalled: true,
        installMethod: detectInstallMethod(path),
        category,
      }
    } catch {
      return createUnavailableTool(name, display, category)
    }
  }
  
  /**
   * Detect a single tool by name
   * 
   * @param toolName The name of the tool to detect
   * @returns Promise resolving to ToolInfo
   */
  async detectTool(toolName: string): Promise<ToolInfo> {
    const lowerName = toolName.toLowerCase()
    
    switch (lowerName) {
      case 'node':
      case 'nodejs':
      case 'node.js':
        return this.detectNodeJS()
      case 'npm':
        return this.detectNpm()
      case 'python':
      case 'python3':
        return this.detectPython()
      case 'pip':
      case 'pip3':
        return this.detectPip()
      case 'php':
        return this.detectPHP()
      case 'composer':
        return this.detectComposer()
      default:
        return this.detectCustomTool(toolName)
    }
  }
  
  /**
   * Detect all supported tools with controlled concurrency
   * 
   * Property 11: Partial Failure Resilience
   * Validates: Requirement 1.8 (retrieve version and path)
   * 
   * @returns Promise resolving to array of ToolInfo
   */
  async detectAllTools(): Promise<ToolInfo[]> {
    const results: ToolInfo[] = []
    
    // Define all tools to detect
    const toolDetectors = [
      // Runtimes
      () => this.detectNodeJS(),
      () => this.detectPython(),
      () => this.detectPHP(),
      () => this.detectCustomTool('java', 'Java', '-version'),
      () => this.detectCustomTool('go', 'Go', 'version'),
      () => this.detectCustomTool('rustc', 'Rust', '--version'),
      () => this.detectCustomTool('ruby', 'Ruby', '--version'),
      () => this.detectCustomTool('dotnet', '.NET', '--version'),
      
      // Package Managers
      () => this.detectNpm(),
      () => this.detectPip(),
      () => this.detectComposer(),
      () => this.detectCustomTool('yarn', 'Yarn', '--version'),
      () => this.detectCustomTool('pnpm', 'pnpm', '--version'),
      () => this.detectCustomTool('cargo', 'Cargo', '--version'),
      () => this.detectCustomTool('gem', 'RubyGems', '--version'),
      
      // Version Control & Tools
      () => this.detectCustomTool('git', 'Git', '--version'),
      () => this.detectCustomTool('docker', 'Docker', '--version'),
      () => this.detectCustomTool('kubectl', 'Kubernetes CLI', 'version --client'),
      () => this.detectCustomTool('terraform', 'Terraform', '--version'),
    ]
    
    // Run with controlled concurrency (3 at a time) to avoid system overload
    const concurrency = 3
    for (let i = 0; i < toolDetectors.length; i += concurrency) {
      const batch = toolDetectors.slice(i, i + concurrency)
      const batchResults = await Promise.all(batch.map(fn => fn().catch(() => null)))
      for (const result of batchResults) {
        if (result !== null) {
          results.push(result)
        }
      }
    }
    
    return results
  }
}

// Export a default instance
export const detectionEngine = new DetectionEngine()
