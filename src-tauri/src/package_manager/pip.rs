//! pip package manager support

use super::{PackageInfo, PackageManager};
use serde::Deserialize;

use crate::utils::command::command_output_with_timeout;
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

#[derive(Deserialize)]
struct PipOutdatedPackage {
    name: String,
    version: String,
    latest_version: String,
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

        // Skip outdated check for now - it requires network and is very slow
        // TODO: Move to async background task
        // let outdated_output =
        //     run_pip_command(&self.command, &["list", "--outdated", "--format=json"])
        //         .unwrap_or_default();
        // let outdated: Vec<PipOutdatedPackage> =
        //     serde_json::from_str(&outdated_output).unwrap_or_default();

        let outdated_map: std::collections::HashMap<String, String> =
            std::collections::HashMap::new();

        for pkg in list {
            // Skip common system packages
            if pkg.name == "pip" || pkg.name == "setuptools" || pkg.name == "wheel" {
                continue;
            }

            let name_lower = pkg.name.to_lowercase();
            let (is_outdated, latest) = if let Some(latest) = outdated_map.get(&name_lower) {
                (true, Some(latest.clone()))
            } else {
                (false, None)
            };

            packages.push(PackageInfo {
                name: pkg.name,
                version: pkg.version,
                latest,
                manager: "pip".to_string(),
                is_outdated,
                description: None,
            });
        }

        packages
    }

    fn update_package(&self, name: &str) -> Result<String, String> {
        match run_pip_command(&self.command, &["install", "--upgrade", name]) {
            Some(output) => Ok(format!("Updated {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to update {}", name)),
        }
    }

    fn uninstall_package(&self, name: &str) -> Result<String, String> {
        match run_pip_command(&self.command, &["uninstall", "-y", name]) {
            Some(output) => Ok(format!("Uninstalled {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to uninstall {}", name)),
        }
    }
}

fn run_pip_command(command: &PipCommand, args: &[&str]) -> Option<String> {
    let mut full_args: Vec<String> = Vec::new();
    full_args.extend(command.prefix_args.iter().cloned());
    full_args.extend(args.iter().map(|s| s.to_string()));

    // On Windows, pip may need to run via cmd /C
    #[cfg(target_os = "windows")]
    let output = {
        let mut pip_args = Vec::with_capacity(1 + full_args.len());
        pip_args.push(command.program.clone());
        pip_args.extend(full_args.iter().cloned());
        let pip_args = pip_args.join(" ");
        {
            let cmd_args = ["/C", pip_args.as_str()];
            command_output_with_timeout("cmd", &cmd_args, Duration::from_secs(30)).ok()?
        }
    };

    #[cfg(not(target_os = "windows"))]
    let output = {
        let arg_refs: Vec<&str> = full_args.iter().map(|s| s.as_str()).collect();
        command_output_with_timeout(&command.program, &arg_refs, Duration::from_secs(30)).ok()?
    };

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        None
    }
}
