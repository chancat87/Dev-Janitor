//! Tauri commands for tool detection and management

use crate::detection::{scan_all_tools, ToolInfo};

use crate::utils::command::command_no_window;
use crate::ai_cli;

/// Scan for all development tools
#[tauri::command]
pub fn scan_tools() -> Vec<ToolInfo> {
    scan_all_tools()
}

/// Get tool info by ID
#[tauri::command]
pub fn get_tool_info(#[allow(non_snake_case)] toolId: String) -> Option<ToolInfo> {
    let tools = scan_all_tools();
    tools.into_iter().find(|t| t.id == toolId)
}

/// Uninstall a tool
#[tauri::command]
pub fn uninstall_tool(#[allow(non_snake_case)] toolId: String, path: String) -> Result<String, String> {
    // Get uninstall command based on tool type
    let uninstall_result = match toolId.as_str() {
        // Package managers installed via npm
        "pnpm" | "yarn" => run_command("npm", &["uninstall", "-g", &toolId]),

        // Python tools
        "pip" | "pipx" | "poetry" | "uv" => {
            // pipx-installed tools
            run_command("pipx", &["uninstall", &toolId])
        }

        // Rust tools
        "cargo" | "rustup" => Err(
            "Rust toolchain should be uninstalled via rustup. Run: rustup self uninstall"
                .to_string(),
        ),

        // Version managers - special handling
        "nvm" => {
            #[cfg(target_os = "windows")]
            {
                Err(
                    "nvm for Windows should be uninstalled from Windows Settings > Apps"
                        .to_string(),
                )
            }
            #[cfg(not(target_os = "windows"))]
            {
                Err("Remove nvm by deleting ~/.nvm and removing the source lines from your shell config".to_string())
            }
        }

        "pyenv" => {
            #[cfg(target_os = "windows")]
            {
                Err("pyenv-win should be uninstalled by removing the .pyenv folder from your user directory".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                Err("Remove pyenv by deleting ~/.pyenv and removing the init lines from your shell config".to_string())
            }
        }

        // AI CLI tools - defer to dedicated module (handles latest install methods)
        "codex" | "claude" | "gemini" | "opencode" => {
            ai_cli::uninstall_ai_tool(&toolId)
        }
        // AI CLI tool (npm-based)
        "iflow" => run_command("npm", &["uninstall", "-g", "@iflow-ai/iflow-cli"]),

        // System-level tools - provide instructions
        "node" | "python" | "java" | "go" | "ruby" | "php" | "dotnet" | "deno" | "bun" => {
            #[cfg(target_os = "windows")]
            {
                Err(format!(
                    "{} should be uninstalled from Windows Settings > Apps",
                    toolId
                ))
            }
            #[cfg(target_os = "macos")]
            {
                Err(format!("{} should be uninstalled via Homebrew (brew uninstall {}) or from the original installer", toolId, toolId))
            }
            #[cfg(target_os = "linux")]
            {
                Err(format!(
                    "{} should be uninstalled via your package manager (apt/yum/pacman)",
                    toolId
                ))
            }
        }

        // Docker and containers
        "docker" | "podman" | "kubectl" => Err(format!(
            "{} should be uninstalled from your system's application management",
            toolId
        )),

        // Build tools
        "cmake" | "make" | "ninja" => Err(format!(
            "{} should be uninstalled via your system's package manager",
            toolId
        )),

        // Version control
        "git" | "svn" => Err(format!(
            "{} should be uninstalled via your system's package manager or installer",
            toolId
        )),

        _ => Err(format!(
            "Uninstall method for {} is not configured. Path: {}",
            toolId, path
        )),
    };

    uninstall_result
}

/// Run a command and return result
fn run_command(cmd: &str, args: &[&str]) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let output = {
        let mut full = String::new();
        full.push_str(cmd);
        if !args.is_empty() {
            full.push(' ');
            full.push_str(&args.join(" "));
        }
        let cmd_args = ["/C", full.as_str()];
        command_no_window("cmd").args(cmd_args).output()
    };

    #[cfg(not(target_os = "windows"))]
    let output = command_no_window(cmd).args(args).output();

    match output {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(format!(
                    "Successfully executed: {} {}\n{}",
                    cmd,
                    args.join(" "),
                    stdout
                ))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                Err(format!("Command failed: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}
