//! Tauri commands for service monitoring

use crate::services::{
    get_all_processes, get_common_dev_ports, get_dev_processes, get_ports_in_use, kill_process,
    PortInfo, ProcessInfo,
};

/// Get all development-related processes
#[tauri::command]
pub fn get_dev_processes_cmd() -> Vec<ProcessInfo> {
    get_dev_processes()
}

/// Get all running processes
#[tauri::command]
pub fn get_all_processes_cmd() -> Vec<ProcessInfo> {
    get_all_processes()
}

/// Kill a process by PID
#[tauri::command]
pub fn kill_process_cmd(pid: u32) -> Result<String, String> {
    kill_process(pid)
}

/// Get all ports in use
#[tauri::command]
pub fn get_ports_cmd() -> Vec<PortInfo> {
    get_ports_in_use()
}

/// Get common dev ports
#[tauri::command]
pub fn get_common_dev_ports_cmd() -> Vec<PortInfo> {
    get_common_dev_ports()
}
