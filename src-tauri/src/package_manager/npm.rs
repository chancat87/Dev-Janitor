//! npm package manager support

use super::{PackageInfo, PackageManager};
use serde::Deserialize;

use crate::utils::command::command_output_with_timeout;
use std::time::Duration;

pub struct NpmManager {
    version: String,
}

#[derive(Deserialize)]
struct NpmListOutput {
    dependencies: Option<std::collections::HashMap<String, NpmPackage>>,
}

#[derive(Deserialize)]
struct NpmPackage {
    version: Option<String>,
}

#[derive(Deserialize)]
struct NpmOutdatedPackage {
    latest: String,
}

impl NpmManager {
    pub fn new() -> Option<Self> {
        let output = run_npm_command(&["--version"])?;
        let version = output.trim().to_string();
        Some(Self { version })
    }
}

impl PackageManager for NpmManager {
    fn name(&self) -> &str {
        "npm"
    }

    fn is_available(&self) -> bool {
        true
    }

    fn get_version(&self) -> Option<String> {
        Some(self.version.clone())
    }

    fn list_packages(&self) -> Vec<PackageInfo> {
        let mut packages = Vec::new();

        // Get global packages
        let output = match run_npm_command(&["list", "-g", "--depth=0", "--json"]) {
            Some(o) => o,
            None => return packages,
        };

        let list: NpmListOutput = match serde_json::from_str(&output) {
            Ok(l) => l,
            Err(_) => return packages,
        };

        let outdated = run_npm_command(&["outdated", "-g", "--json", "--long", "--depth=0"])
            .and_then(|output| {
                serde_json::from_str::<std::collections::HashMap<String, NpmOutdatedPackage>>(
                    &output,
                )
                .ok()
            });

        if let Some(deps) = list.dependencies {
            for (name, pkg) in deps {
                let Some(version) = pkg.version else {
                    continue;
                };
                // Skip npm itself
                if name == "npm" {
                    continue;
                }

                let (is_outdated, latest) =
                    if let Some(out) = outdated.as_ref().and_then(|entries| entries.get(&name)) {
                        (true, Some(out.latest.clone()))
                    } else {
                        (false, None)
                    };

                packages.push(PackageInfo {
                    name,
                    version,
                    latest,
                    manager: "npm".to_string(),
                    is_outdated,
                    update_checked: outdated.is_some(),
                    description: None,
                });
            }
        }

        packages
    }

    fn update_package(&self, name: &str) -> Result<String, String> {
        super::run_package_action("npm", &["install", "-g", &format!("{name}@latest")], name)
    }

    fn uninstall_package(&self, name: &str) -> Result<String, String> {
        super::run_package_action("npm", &["uninstall", "-g", name], name)
    }
}

fn run_npm_command(args: &[&str]) -> Option<String> {
    let output = command_output_with_timeout("npm", args, Duration::from_secs(30)).ok()?;

    if output.status.success() {
        Some(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        // For npm outdated, non-zero exit is normal when packages are outdated
        if args.first() == Some(&"outdated") && output.status.code() == Some(1) {
            Some(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn linked_package_without_version_does_not_hide_other_packages() {
        let list: NpmListOutput = serde_json::from_str(
            r#"{
            "dependencies": {
                "local-tool": { "resolved": "file:../local-tool" },
                "@openai/codex": { "version": "1.2.3" }
            }
        }"#,
        )
        .unwrap();
        let dependencies = list.dependencies.unwrap();
        assert_eq!(
            dependencies["@openai/codex"].version.as_deref(),
            Some("1.2.3")
        );
        assert!(dependencies["local-tool"].version.is_none());
    }
}
