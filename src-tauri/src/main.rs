#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;
mod events;
mod models;
mod process_manager;
mod rpc_transport;
mod terminal_manager;

use commands::{
    app_import_official_data, app_open_codex_config_toml, app_open_external, app_server_restart,
    app_server_start, app_server_stop, app_show_context_menu, app_show_notification, rpc_cancel,
    rpc_request, server_request_resolve, terminal_close_session, terminal_create_session,
    terminal_resize, terminal_write,
};
use process_manager::ProcessManager;
use terminal_manager::TerminalManager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ProcessManager::new())
        .manage(TerminalManager::new())
        .invoke_handler(tauri::generate_handler![
            app_server_start,
            app_server_stop,
            app_server_restart,
            rpc_request,
            rpc_cancel,
            server_request_resolve,
            app_open_external,
            app_open_codex_config_toml,
            app_show_notification,
            app_show_context_menu,
            app_import_official_data,
            terminal_create_session,
            terminal_write,
            terminal_resize,
            terminal_close_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
