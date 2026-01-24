//! Tauri commands for cache management

use crate::cache::{clean_cache, scan_package_manager_caches, scan_project_caches, CacheInfo};

/// Scan all package manager caches
#[tauri::command]
pub fn scan_caches() -> Vec<CacheInfo> {
    scan_package_manager_caches()
}

/// Scan project caches in a directory
#[tauri::command]
pub fn scan_project_caches_cmd(path: String, max_depth: usize) -> Vec<CacheInfo> {
    scan_project_caches(&path, max_depth)
}

/// Clean a specific cache
#[tauri::command]
pub fn clean_cache_cmd(path: String) -> Result<String, String> {
    clean_cache(&path)
}

/// Clean multiple caches
#[tauri::command]
pub fn clean_multiple_caches(paths: Vec<String>) -> Vec<Result<String, String>> {
    paths.into_iter().map(|path| clean_cache(&path)).collect()
}

/// Get total size of selected caches
#[tauri::command]
pub fn get_total_cache_size(paths: Vec<String>) -> String {
    let total: u64 = paths
        .iter()
        .filter_map(|p| {
            let path = std::path::PathBuf::from(p);
            if path.exists() {
                Some(crate::cache::get_dir_size(&path))
            } else {
                None
            }
        })
        .sum();

    crate::cache::format_size(total)
}
