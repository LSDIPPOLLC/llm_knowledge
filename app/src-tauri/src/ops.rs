use crate::AppState;
use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};

#[derive(Default)]
pub struct OpsRegistry {
    pub running: HashMap<u64, Arc<Mutex<Child>>>,
    pub next_id: u64,
}

#[derive(Serialize, Clone)]
struct OpChunk {
    id: u64,
    stream: String,
    data: String,
}

#[derive(Serialize, Clone)]
struct OpExit {
    id: u64,
    code: i32,
}

fn build_command(kind: &str, arg: &str) -> (String, Vec<String>) {
    match kind {
        "ingest" => ("claude".into(), vec!["-p".into(), format!("ingest {}", arg)]),
        "sync" => ("claude".into(), if arg.is_empty() {
            vec!["-p".into(), "sync raw".into()]
        } else {
            vec!["-p".into(), format!("sync {}", arg)]
        }),
        "lint" => ("claude".into(), vec!["-p".into(), "lint the wiki".into()]),
        "deprecate" => ("claude".into(), vec!["-p".into(), format!("deprecate {}", arg)]),
        "query" => ("claude".into(), vec!["-p".into(), arg.to_string()]),
        "search" => (
            crate::search::python_bin().to_string(),
            vec![".claude/wiki_query.py".into(), arg.into(), "--json".into()],
        ),
        other => (other.into(), vec![arg.into()]),
    }
}

#[tauri::command]
pub fn ops_run(
    app: AppHandle,
    state: State<AppState>,
    kind: String,
    arg: String,
) -> Result<u64, String> {
    let root = state
        .vault_root
        .lock()
        .unwrap()
        .clone()
        .ok_or("vault root not set")?;
    let (program, args) = build_command(&kind, &arg);
    let mut cmd = Command::new(&program);
    cmd.args(&args)
        .current_dir(PathBuf::from(&root))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("spawn {} failed: {}", program, e))?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;

    let id = {
        let mut reg = state.ops.lock().unwrap();
        reg.next_id += 1;
        let id = reg.next_id;
        let child_arc = Arc::new(Mutex::new(child));
        reg.running.insert(id, child_arc.clone());
        drop(reg);

        let app1 = app.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                let _ = app1.emit("ops:chunk", OpChunk { id, stream: "stdout".into(), data: line });
            }
        });
        let app2 = app.clone();
        thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                let _ = app2.emit("ops:chunk", OpChunk { id, stream: "stderr".into(), data: line });
            }
        });
        let app3 = app.clone();
        let child_arc2 = child_arc.clone();
        thread::spawn(move || {
            let code = child_arc2
                .lock()
                .unwrap()
                .wait()
                .map(|s| s.code().unwrap_or(-1))
                .unwrap_or(-1);
            let _ = app3.emit("ops:exit", OpExit { id, code });
        });
        id
    };

    Ok(id)
}

#[tauri::command]
pub fn ops_cancel(state: State<AppState>, id: u64) -> Result<(), String> {
    let reg = state.ops.lock().unwrap();
    if let Some(ch) = reg.running.get(&id) {
        let _ = ch.lock().unwrap().kill();
    }
    Ok(())
}
