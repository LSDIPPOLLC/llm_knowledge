mod fs_cmds;
mod wiki;
mod ops;
mod search;

use std::sync::Mutex;

pub struct AppState {
    pub vault_root: Mutex<Option<String>>,
    pub ops: Mutex<ops::OpsRegistry>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            vault_root: Mutex::new(None),
            ops: Mutex::new(ops::OpsRegistry::default()),
        })
        .invoke_handler(tauri::generate_handler![
            fs_cmds::set_vault_root,
            fs_cmds::get_vault_root,
            fs_cmds::vault_list,
            fs_cmds::file_read,
            fs_cmds::file_write,
            fs_cmds::file_create,
            fs_cmds::dir_create,
            wiki::graph_build,
            wiki::backlinks,
            ops::ops_run,
            ops::ops_cancel,
            search::search_wiki,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
