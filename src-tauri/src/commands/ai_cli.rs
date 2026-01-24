//! Tauri commands for AI CLI tools management

use crate::ai_cli::{
    get_ai_cli_tools, install_ai_tool, uninstall_ai_tool, update_ai_tool, AiCliTool,
};

/// Get all AI CLI tools with status
#[tauri::command]
pub fn get_ai_cli_tools_cmd() -> Vec<AiCliTool> {
    get_ai_cli_tools()
}

/// Install an AI CLI tool
#[tauri::command]
pub fn install_ai_tool_cmd(tool_id: String) -> Result<String, String> {
    install_ai_tool(&tool_id)
}

/// Update an AI CLI tool
#[tauri::command]
pub fn update_ai_tool_cmd(tool_id: String) -> Result<String, String> {
    update_ai_tool(&tool_id)
}

/// Uninstall an AI CLI tool
#[tauri::command]
pub fn uninstall_ai_tool_cmd(tool_id: String) -> Result<String, String> {
    uninstall_ai_tool(&tool_id)
}
