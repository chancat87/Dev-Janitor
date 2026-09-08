//! Package manager module for Dev Janitor v2
//! Supports npm, pip, Cargo, Composer, Homebrew, Conda, etc.

pub mod cargo;
pub mod composer;
pub mod conda;
pub mod homebrew;
pub mod npm;
pub mod pip;
pub mod pnpm;
pub mod yarn;

use rayon::prelude::*;
use serde::{Deserialize, Serialize};

/// Represents a global package from any package manager
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageInfo {
    pub name: String,
    pub version: String,
    pub latest: Option<String>,
    pub manager: String,
    pub is_outdated: bool,
    pub update_checked: bool,
    pub description: Option<String>,
}

/// Common trait for all package managers
pub trait PackageManager {
    /// Get the name of this package manager
    fn name(&self) -> &str;

    /// Check if this package manager is available on the system
    fn is_available(&self) -> bool;

    /// Get the version of this package manager
    fn get_version(&self) -> Option<String>;

    /// List all global packages
    fn list_packages(&self) -> Vec<PackageInfo>;

    /// Update a package to the latest version
    fn update_package(&self, name: &str) -> Result<String, String>;

    /// Uninstall a package
    fn uninstall_package(&self, name: &str) -> Result<String, String>;
}

/// 变更操作保留错误输出，并给下载和编译留出足够时间。
fn run_package_action(program: &str, args: &[&str], name: &str) -> Result<String, String> {
    validate_package_name(name)?;
    let output = crate::utils::command::command_output_with_timeout(
        program,
        args,
        std::time::Duration::from_secs(900),
    )
    .map_err(|error| format!("{program}: {error}"))?;
    package_action_result(program, output)
}

fn package_action_result(program: &str, output: std::process::Output) -> Result<String, String> {
    let message = format!(
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    if output.status.success() {
        Ok(message.trim().to_string())
    } else {
        Err(format!(
            "{program} failed ({}):\n{}",
            output.status,
            message.trim()
        ))
    }
}

fn validate_package_name(name: &str) -> Result<(), String> {
    // 仅接受包名，避免选项、URL、路径和 shell 展开被当成包操作。
    let valid_part = |part: &str| {
        part.starts_with(|ch: char| ch.is_ascii_alphanumeric())
            && part
                .chars()
                .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
    };
    let unscoped = name.strip_prefix('@').unwrap_or(name);
    let base = if !name.starts_with('@') {
        if let Some((base, version)) = unscoped.rsplit_once('@') {
            if version.is_empty() || !version.chars().all(|ch| ch.is_ascii_digit() || ch == '.') {
                return Err(format!("Invalid package name: {name}"));
            }
            base
        } else {
            unscoped
        }
    } else {
        unscoped
    };
    let parts: Vec<_> = base.split('/').collect();
    let valid = !name.is_empty()
        && parts.len() <= 2
        && (!name.starts_with('@') || parts.len() == 2)
        && parts.iter().all(|part| valid_part(part));
    if valid {
        Ok(())
    } else {
        Err(format!("Invalid package name: {name}"))
    }
}

type PackageScanFn = fn() -> Vec<PackageInfo>;

fn scan_npm_packages() -> Vec<PackageInfo> {
    npm::NpmManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_pnpm_packages() -> Vec<PackageInfo> {
    pnpm::PnpmManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_yarn_packages() -> Vec<PackageInfo> {
    yarn::YarnManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_pip_packages() -> Vec<PackageInfo> {
    pip::PipManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_cargo_packages() -> Vec<PackageInfo> {
    cargo::CargoManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_composer_packages() -> Vec<PackageInfo> {
    composer::ComposerManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_homebrew_packages() -> Vec<PackageInfo> {
    homebrew::HomebrewManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

fn scan_conda_packages() -> Vec<PackageInfo> {
    conda::CondaManager::new().map_or_else(Vec::new, |manager| manager.list_packages())
}

/// Scan all available package managers and list their packages
pub fn scan_all_packages() -> Vec<PackageInfo> {
    let package_scanners: [PackageScanFn; 8] = [
        scan_npm_packages,
        scan_pnpm_packages,
        scan_yarn_packages,
        scan_pip_packages,
        scan_cargo_packages,
        scan_composer_packages,
        scan_homebrew_packages,
        scan_conda_packages,
    ];

    let mut all_packages: Vec<PackageInfo> = package_scanners
        .par_iter()
        .flat_map(|scan| scan())
        .collect();

    all_packages.sort_by(|left, right| {
        left.manager
            .cmp(&right.manager)
            .then_with(|| left.name.cmp(&right.name))
    });

    all_packages
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_options_and_package_specs() {
        for name in [
            "",
            "--all",
            "-y",
            "@scope",
            "../tool",
            "a/b/c",
            "tool@next",
            "https://example.com",
            "a;id",
            "%PATH%",
            "a b",
        ] {
            assert!(validate_package_name(name).is_err(), "{name}");
        }
        for name in [
            "@openai/codex",
            "vendor/package",
            "python_tool",
            "foo-bar",
            "openssl@3",
        ] {
            assert!(validate_package_name(name).is_ok(), "{name}");
        }
    }

    #[cfg(unix)]
    #[test]
    fn stderr_does_not_turn_failed_actions_into_success() {
        use std::os::unix::process::ExitStatusExt;
        let result = package_action_result(
            "cargo",
            std::process::Output {
                status: std::process::ExitStatus::from_raw(101 << 8),
                stdout: Vec::new(),
                stderr: b"compilation failed".to_vec(),
            },
        );
        assert!(result.unwrap_err().contains("compilation failed"));
    }
}
