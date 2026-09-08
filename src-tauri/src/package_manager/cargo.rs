//! Cargo package manager support

use super::{PackageInfo, PackageManager};
use regex::Regex;

use crate::utils::command::command_output_with_timeout;
use std::time::Duration;

pub struct CargoManager {
    version: String,
}

impl CargoManager {
    pub fn new() -> Option<Self> {
        let output = run_cargo_command(&["--version"])?;
        // Extract version from "cargo X.Y.Z (hash date)"
        let version = output
            .split_whitespace()
            .nth(1)
            .unwrap_or("unknown")
            .to_string();
        Some(Self { version })
    }
}

impl PackageManager for CargoManager {
    fn name(&self) -> &str {
        "cargo"
    }

    fn is_available(&self) -> bool {
        true
    }

    fn get_version(&self) -> Option<String> {
        Some(self.version.clone())
    }

    fn list_packages(&self) -> Vec<PackageInfo> {
        let mut packages = Vec::new();

        // Get installed packages via cargo install --list
        let output = match run_cargo_command(&["install", "--list"]) {
            Some(o) => o,
            None => return packages,
        };

        // Parse output format:
        // package_name v1.2.3:
        //     binary1
        //     binary2
        let re = Regex::new(r"^(\S+)\s+v([0-9][^\s:]*)").unwrap();

        for line in output.lines() {
            if let Some(caps) = re.captures(line) {
                let name = caps.get(1).map(|m| m.as_str()).unwrap_or("").to_string();
                let version = caps.get(2).map(|m| m.as_str()).unwrap_or("").to_string();

                if !name.is_empty() {
                    packages.push(PackageInfo {
                        name,
                        version,
                        latest: None, // Cargo doesn't easily provide latest version
                        manager: "cargo".to_string(),
                        is_outdated: false,
                        update_checked: false,
                        description: None,
                    });
                }
            }
        }

        packages
    }

    fn update_package(&self, name: &str) -> Result<String, String> {
        super::run_package_action("cargo", &["install", name, "--locked"], name)
    }

    fn uninstall_package(&self, name: &str) -> Result<String, String> {
        super::run_package_action("cargo", &["uninstall", name], name)
    }
}

fn run_cargo_command(args: &[&str]) -> Option<String> {
    let output = command_output_with_timeout("cargo", args, Duration::from_secs(30)).ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    // Cargo often outputs to stderr
    if output.status.success() {
        Some(format!("{}{}", stdout, stderr))
    } else {
        None
    }
}
