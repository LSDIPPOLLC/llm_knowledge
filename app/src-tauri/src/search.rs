use crate::AppState;
use std::path::PathBuf;
use std::process::Command;
use tauri::State;

pub fn python_bin() -> &'static str {
    // Prefer python3; fall back to python.
    static CHOICE: once_cell::sync::OnceCell<&'static str> = once_cell::sync::OnceCell::new();
    CHOICE.get_or_init(|| {
        for bin in ["python3", "python"] {
            if Command::new(bin).arg("--version").output().is_ok() {
                return bin;
            }
        }
        "python3"
    })
}

#[tauri::command]
pub fn search_wiki(
    state: State<AppState>,
    term: String,
    scope: Option<String>,
) -> Result<String, String> {
    let root = state
        .vault_root
        .lock()
        .unwrap()
        .clone()
        .ok_or("vault root not set")?;
    let mut cmd = Command::new(python_bin());
    cmd.arg(".claude/wiki_query.py").arg(&term).arg("--json");
    match scope.as_deref() {
        Some("pages") => { cmd.arg("--pages"); }
        Some("sources") => { cmd.arg("--sources"); }
        Some("domains") => { cmd.arg("--domains"); }
        Some("recent") => { cmd.arg("--recent"); }
        _ => {}
    }
    let out = cmd
        .current_dir(PathBuf::from(&root))
        .output()
        .map_err(|e| format!("{} ({})", e, python_bin()))?;
    // Exit 1 = no matches (valid), 0 = matches. Anything else = real error.
    let code = out.status.code().unwrap_or(-1);
    if code != 0 && code != 1 {
        let stderr = String::from_utf8_lossy(&out.stderr);
        return Err(format!("wiki_query.py exited {}: {}", code, stderr.trim()));
    }
    Ok(String::from_utf8_lossy(&out.stdout).to_string())
}
