//! Tauri commands for environment configuration diagnostics

use crate::config::{
    analyze_path, diagnose_environment, get_path_cleanup_suggestions, get_shell_configs,
    EnvDiagnosis, PathEntry, ShellConfig,
};

/// Analyze current PATH
#[tauri::command]
pub fn analyze_path_cmd() -> Vec<PathEntry> {
    analyze_path()
}

/// Get shell configuration files
#[tauri::command]
pub fn get_shell_configs_cmd() -> Vec<ShellConfig> {
    get_shell_configs()
}

/// Run full environment diagnosis
#[tauri::command]
pub fn diagnose_env_cmd() -> EnvDiagnosis {
    diagnose_environment()
}

/// Get PATH cleanup suggestions
#[tauri::command]
pub fn get_path_suggestions_cmd() -> Vec<String> {
    let entries = analyze_path();
    get_path_cleanup_suggestions(&entries)
}
