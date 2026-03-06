//! Homebrew package manager support (macOS and Linux)

use super::{PackageInfo, PackageManager};

use crate::utils::command::command_output_with_timeout;
use std::time::Duration;

pub struct HomebrewManager {
    version: String,
}

impl HomebrewManager {
    pub fn new() -> Option<Self> {
        let output = run_brew_command(&["--version"])?;
        let version = output
            .lines()
            .next()
            .and_then(|line| line.split_whitespace().nth(1))
            .unwrap_or("unknown")
            .to_string();
        Some(Self { version })
    }
}

impl PackageManager for HomebrewManager {
    fn name(&self) -> &str {
        "homebrew"
    }

    fn is_available(&self) -> bool {
        true
    }

    fn get_version(&self) -> Option<String> {
        Some(self.version.clone())
    }

    fn list_packages(&self) -> Vec<PackageInfo> {
        let mut packages = Vec::new();

        let output = match run_brew_command(&["list", "--formula", "--versions"]) {
            Some(o) => o,
            None => return packages,
        };

        let outdated_output = run_brew_command(&["outdated", "--formula"]).unwrap_or_default();
        let outdated_names: std::collections::HashSet<String> = outdated_output
            .lines()
            .map(|l| l.split_whitespace().next().unwrap_or("").to_string())
            .collect();

        for line in output.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let name = parts[0].to_string();
                let version = parts[1].to_string();
                let is_outdated = outdated_names.contains(&name);

                packages.push(PackageInfo {
                    name,
                    version,
                    latest: None,
                    manager: "homebrew".to_string(),
                    is_outdated,
                    description: None,
                });
            }
        }

        packages
    }

    fn update_package(&self, name: &str) -> Result<String, String> {
        match run_brew_command(&["upgrade", name]) {
            Some(output) => Ok(format!("Updated {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to update {}", name)),
        }
    }

    fn uninstall_package(&self, name: &str) -> Result<String, String> {
        match run_brew_command(&["uninstall", name]) {
            Some(output) => Ok(format!("Uninstalled {} successfully:\n{}", name, output)),
            None => Err(format!("Failed to uninstall {}", name)),
        }
    }
}

fn run_brew_command(args: &[&str]) -> Option<String> {
    let output = command_output_with_timeout("brew", args, Duration::from_secs(30)).ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        None
    }
}
