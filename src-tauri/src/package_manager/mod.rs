//! Package manager module for Dev Janitor v2
//! Supports npm, pip, Cargo, Composer, Homebrew, Conda, etc.

pub mod cargo;
pub mod composer;
pub mod conda;
pub mod homebrew;
pub mod npm;
pub mod pip;

use serde::{Deserialize, Serialize};

/// Represents a global package from any package manager
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageInfo {
    pub name: String,
    pub version: String,
    pub latest: Option<String>,
    pub manager: String,
    pub is_outdated: bool,
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

/// Scan all available package managers and list their packages
pub fn scan_all_packages() -> Vec<PackageInfo> {
    let mut all_packages = Vec::new();

    // npm
    if let Some(packages) = npm::NpmManager::new().map(|m| m.list_packages()) {
        all_packages.extend(packages);
    }

    // pip
    if let Some(packages) = pip::PipManager::new().map(|m| m.list_packages()) {
        all_packages.extend(packages);
    }

    // Cargo
    if let Some(packages) = cargo::CargoManager::new().map(|m| m.list_packages()) {
        all_packages.extend(packages);
    }

    // Composer
    if let Some(packages) = composer::ComposerManager::new().map(|m| m.list_packages()) {
        all_packages.extend(packages);
    }

    // Homebrew (macOS only)
    #[cfg(target_os = "macos")]
    if let Some(packages) = homebrew::HomebrewManager::new().map(|m| m.list_packages()) {
        all_packages.extend(packages);
    }

    // Conda
    if let Some(packages) = conda::CondaManager::new().map(|m| m.list_packages()) {
        all_packages.extend(packages);
    }

    all_packages
}
