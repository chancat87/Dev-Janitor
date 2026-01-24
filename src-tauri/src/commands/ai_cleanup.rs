//! Tauri commands for AI junk cleanup

use crate::ai_cleanup::{delete_ai_junk, scan_ai_junk, AiJunkFile};

/// Scan a directory for AI junk files
#[tauri::command]
pub fn scan_ai_junk_cmd(path: String, max_depth: usize) -> Vec<AiJunkFile> {
    scan_ai_junk(&path, max_depth)
}

/// Delete an AI junk file
#[tauri::command]
pub fn delete_ai_junk_cmd(path: String) -> Result<String, String> {
    delete_ai_junk(&path)
}

/// Delete multiple AI junk files
#[tauri::command]
pub fn delete_multiple_ai_junk(paths: Vec<String>) -> Vec<Result<String, String>> {
    paths
        .into_iter()
        .map(|path| delete_ai_junk(&path))
        .collect()
}
