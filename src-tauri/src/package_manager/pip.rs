//! pip package manager support

use super::{PackageInfo, PackageManager};
use serde::Deserialize;

use crate::utils::command::command_output_with_timeout_vec;
use std::time::Duration;

pub struct PipManager {
    version: String,
    command: PipCommand,
}

#[derive(Clone)]
struct PipCommand {
    program: String,
    prefix_args: Vec<String>,
}

impl PipCommand {
    fn run_action(&self, args: &[&str], name: &str) -> Result<String, String> {
        let mut full_args: Vec<&str> = self.prefix_args.iter().map(String::as_str).collect();
        full_args.extend_from_slice(args);
        super::run_package_action(&self.program, &full_args, name)
    }

    fn new(program: &str, prefix_args: &[&str]) -> Self {
        Self {
            program: program.to_string(),
            prefix_args: prefix_args.iter().map(|s| s.to_string()).collect(),
        }
    }
}

#[derive(Deserialize)]
struct PipPackage {
    name: String,
    version: String,
}

impl PipManager {
    pub fn new() -> Option<Self> {
        // Prefer invoking pip via the Python launcher/interpreter when available.
        // This avoids ambiguity when multiple Python installs exist.
        #[cfg(target_os = "windows")]
        let candidates = vec![
            PipCommand::new("py", &["-m", "pip"]),
            PipCommand::new("python", &["-m", "pip"]),
            PipCommand::new("python3", &["-m", "pip"]),
            PipCommand::new("pip3", &[]),
            PipCommand::new("pip", &[]),
        ];

        #[cfg(not(target_os = "windows"))]
        let candidates = vec![
            PipCommand::new("python3", &["-m", "pip"]),
            PipCommand::new("python", &["-m", "pip"]),
            PipCommand::new("pip3", &[]),
            PipCommand::new("pip", &[]),
        ];

        for cmd in &candidates {
            if let Some(output) = run_pip_command(cmd, &["--version"]) {
                // Extract version from "pip X.Y.Z from ..."
                let version = output
                    .split_whitespace()
                    .nth(1)
                    .unwrap_or("unknown")
                    .to_string();
                return Some(Self {
                    version,
                    command: cmd.clone(),
                });
            }
        }
        None
    }
}

impl PackageManager for PipManager {
    fn name(&self) -> &str {
        "pip"
    }

    fn is_available(&self) -> bool {
        true
    }

    fn get_version(&self) -> Option<String> {
        Some(self.version.clone())
    }

    fn list_packages(&self) -> Vec<PackageInfo> {
        let mut packages = Vec::new();

        // Get installed packages
        let output = match run_pip_command(&self.command, &["list", "--format=json"]) {
            Some(o) => o,
            None => return packages,
        };

        let list: Vec<PipPackage> = match serde_json::from_str(&output) {
            Ok(l) => l,
            Err(_) => return packages,
        };

        // 扫描仅枚举本地包，未联网检查的状态由界面明确显示。
        for pkg in list {
            // Skip common system packages
            if pkg.name == "pip" || pkg.name == "setuptools" || pkg.name == "wheel" {
                continue;
            }

            packages.push(PackageInfo {
                name: pkg.name,
                version: pkg.version,
                latest: None,
                manager: "pip".to_string(),
                is_outdated: false,
                update_checked: false,
                description: None,
            });
        }

        packages
    }

    fn update_package(&self, name: &str) -> Result<String, String> {
        self.command
            .run_action(&["install", "--upgrade", "--no-input", name], name)
    }

    fn uninstall_package(&self, name: &str) -> Result<String, String> {
        self.command
            .run_action(&["uninstall", "-y", "--no-input", name], name)
    }
}

fn run_pip_command(command: &PipCommand, args: &[&str]) -> Option<String> {
    let mut full_args: Vec<String> = Vec::new();
    full_args.extend(command.prefix_args.iter().cloned());
    full_args.extend(args.iter().map(|s| s.to_string()));

    let output =
        command_output_with_timeout_vec(&command.program, &full_args, Duration::from_secs(30))
            .ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        None
    }
}
