use crate::AppState;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;
use walkdir::WalkDir;

#[derive(Serialize)]
pub struct TreeNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<TreeNode>,
}

#[derive(Serialize)]
pub struct FileData {
    pub content: String,
    pub mtime: u64,
}

fn resolve(state: &State<AppState>, rel: &str) -> Result<PathBuf, String> {
    let root = state
        .vault_root
        .lock()
        .unwrap()
        .clone()
        .ok_or_else(|| "vault root not set".to_string())?;
    let root_path = PathBuf::from(&root);
    let target = root_path.join(rel);
    let canon_root = root_path.canonicalize().map_err(|e| e.to_string())?;
    let canon_target = target
        .canonicalize()
        .or_else(|_| {
            // file may not exist yet (create); verify parent is inside root
            if let Some(parent) = target.parent() {
                let _ = parent.canonicalize().map_err(|e| e.to_string())?;
            }
            Ok::<_, String>(target.clone())
        })?;
    if !canon_target.starts_with(&canon_root) {
        return Err(format!("path escapes vault: {}", rel));
    }
    Ok(canon_target)
}

#[tauri::command]
pub fn set_vault_root(state: State<AppState>, path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if !p.is_dir() {
        return Err(format!("not a directory: {}", path));
    }
    let canon = p.canonicalize().map_err(|e| e.to_string())?;
    *state.vault_root.lock().unwrap() = Some(canon.to_string_lossy().to_string());
    Ok(())
}

#[tauri::command]
pub fn get_vault_root(state: State<AppState>) -> Option<String> {
    state.vault_root.lock().unwrap().clone()
}

fn build_tree(root: &Path, dir: &Path) -> TreeNode {
    let name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| ".".to_string());
    let rel = dir.strip_prefix(root).unwrap_or(dir).to_string_lossy().to_string();
    let mut children = vec![];
    if let Ok(entries) = fs::read_dir(dir) {
        let mut items: Vec<_> = entries.flatten().collect();
        items.sort_by_key(|e| (!e.path().is_dir(), e.file_name()));
        for entry in items {
            let p = entry.path();
            let fname = entry.file_name().to_string_lossy().to_string();
            if fname.starts_with('.') { continue; }
            if p.is_dir() {
                children.push(build_tree(root, &p));
            } else if p.extension().and_then(|x| x.to_str()) == Some("md") {
                let child_rel = p.strip_prefix(root).unwrap_or(&p).to_string_lossy().to_string();
                children.push(TreeNode {
                    name: fname,
                    path: child_rel,
                    is_dir: false,
                    children: vec![],
                });
            }
        }
    }
    TreeNode { name, path: rel, is_dir: true, children }
}

#[tauri::command]
pub fn vault_list(state: State<AppState>) -> Result<Vec<TreeNode>, String> {
    let root = state.vault_root.lock().unwrap().clone().ok_or("vault root not set")?;
    let rp = PathBuf::from(&root);
    let mut top = vec![];
    for sub in &["raw", "wiki"] {
        let p = rp.join(sub);
        if p.is_dir() {
            top.push(build_tree(&rp, &p));
        }
    }
    Ok(top)
}

#[tauri::command]
pub fn file_read(state: State<AppState>, path: String) -> Result<FileData, String> {
    let p = resolve(&state, &path)?;
    let content = fs::read_to_string(&p).map_err(|e| e.to_string())?;
    let mtime = fs::metadata(&p)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    Ok(FileData { content, mtime })
}

#[tauri::command]
pub fn file_write(state: State<AppState>, path: String, content: String) -> Result<u64, String> {
    let p = resolve(&state, &path)?;
    let tmp = p.with_extension(format!(
        "{}.tmp",
        p.extension().and_then(|x| x.to_str()).unwrap_or("md")
    ));
    fs::write(&tmp, &content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &p).map_err(|e| e.to_string())?;
    let mtime = fs::metadata(&p)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    Ok(mtime)
}

#[tauri::command]
pub fn file_create(state: State<AppState>, path: String, content: String) -> Result<(), String> {
    let p = resolve(&state, &path)?;
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    if p.exists() {
        return Err(format!("file exists: {}", path));
    }
    fs::write(&p, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn dir_create(state: State<AppState>, path: String) -> Result<(), String> {
    let p = resolve(&state, &path)?;
    if p.exists() {
        return Err(format!("path exists: {}", path));
    }
    fs::create_dir_all(&p).map_err(|e| e.to_string())?;
    Ok(())
}

#[allow(dead_code)]
pub fn all_md_files(root: &Path) -> Vec<PathBuf> {
    WalkDir::new(root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type().is_file()
                && e.path().extension().and_then(|x| x.to_str()) == Some("md")
        })
        .map(|e| e.path().to_path_buf())
        .collect()
}
