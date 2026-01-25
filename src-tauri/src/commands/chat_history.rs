//! Chat History Tauri commands

use super::super::chat_history::{
    delete_chat_file, delete_project_chat_history, scan_chat_history, scan_global_chat_history,
    ChatHistoryFile, ProjectChatHistory,
};

/// Scan for projects with AI chat history
#[tauri::command]
pub fn scan_chat_history_cmd(path: String, max_depth: usize) -> Vec<ProjectChatHistory> {
    scan_chat_history(&path, max_depth)
}

/// Scan global AI chat history locations
#[tauri::command]
pub fn scan_global_chat_history_cmd() -> Vec<ChatHistoryFile> {
    scan_global_chat_history()
}

/// Delete a single chat history file or directory
#[tauri::command]
pub fn delete_chat_file_cmd(path: String) -> Result<String, String> {
    delete_chat_file(&path)
}

/// Delete all chat history for a project
#[tauri::command]
pub fn delete_project_chat_history_cmd(project_path: String) -> Result<(u32, u32, String), String> {
    delete_project_chat_history(&project_path)
}

/// Delete multiple chat history files
#[tauri::command]
pub fn delete_multiple_chat_files(paths: Vec<String>) -> (u32, u32, Vec<String>) {
    let mut success_count = 0u32;
    let mut fail_count = 0u32;
    let mut errors = Vec::new();

    for path in paths {
        match delete_chat_file(&path) {
            Ok(_) => success_count += 1,
            Err(e) => {
                fail_count += 1;
                errors.push(e);
            }
        }
    }

    (success_count, fail_count, errors)
}
