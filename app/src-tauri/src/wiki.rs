use crate::AppState;
use once_cell::sync::Lazy;
use regex::Regex;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;
use walkdir::WalkDir;

static WIKILINK_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]").unwrap());
static FM_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)^---\n(.*?)\n---").unwrap());

#[derive(Serialize, Clone)]
pub struct GraphNode {
    pub id: String,
    pub path: String,
    pub title: String,
    pub node_type: String,
    pub status: String,
}

#[derive(Serialize)]
pub struct GraphLink {
    pub source: String,
    pub target: String,
}

#[derive(Serialize)]
pub struct Graph {
    pub nodes: Vec<GraphNode>,
    pub links: Vec<GraphLink>,
}

#[derive(Serialize)]
pub struct FrontmatterParsed {
    pub title: Option<String>,
    pub node_type: Option<String>,
    pub status: Option<String>,
}

fn parse_frontmatter(body: &str) -> FrontmatterParsed {
    let mut out = FrontmatterParsed { title: None, node_type: None, status: None };
    if let Some(cap) = FM_RE.captures(body) {
        let yaml = cap.get(1).unwrap().as_str();
        if let Ok(v) = serde_yaml::from_str::<serde_yaml::Value>(yaml) {
            if let Some(m) = v.as_mapping() {
                if let Some(t) = m.get(serde_yaml::Value::String("title".into())).and_then(|x| x.as_str()) {
                    out.title = Some(t.to_string());
                }
                if let Some(t) = m.get(serde_yaml::Value::String("type".into())).and_then(|x| x.as_str()) {
                    out.node_type = Some(t.to_string());
                }
                if let Some(s) = m.get(serde_yaml::Value::String("status".into())).and_then(|x| x.as_str()) {
                    out.status = Some(s.to_string());
                }
            }
        }
    }
    out
}

fn stem(p: &Path) -> String {
    p.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default()
}

struct Page {
    rel: String,
    stem: String,
    title: String,
    ntype: String,
    status: String,
    body: String,
}

fn collect_pages(root: &Path) -> Vec<Page> {
    let mut out = vec![];
    for sub in &["wiki", "raw"] {
        let base = root.join(sub);
        if !base.is_dir() { continue; }
        for entry in WalkDir::new(&base).into_iter().flatten() {
            if !entry.file_type().is_file() { continue; }
            let p = entry.path();
            if p.extension().and_then(|x| x.to_str()) != Some("md") { continue; }
            let rel = p.strip_prefix(root).unwrap_or(p).to_string_lossy().to_string();
            let body = match fs::read_to_string(p) { Ok(s) => s, Err(_) => continue };
            let fm = parse_frontmatter(&body);
            let st = stem(p);
            let title = fm.title.unwrap_or_else(|| st.clone());
            let ntype = fm.node_type.unwrap_or_else(|| {
                if rel.contains("raw/") { "raw".into() }
                else if rel.contains("concepts/") { "concept".into() }
                else if rel.contains("entities/") { "entity".into() }
                else if rel.contains("sources/") { "source-summary".into() }
                else if rel.contains("comparisons/") { "comparison".into() }
                else if rel.contains("reflections/") { "reflection".into() }
                else { "page".into() }
            });
            let status = fm.status.unwrap_or_else(|| "current".into());
            out.push(Page { rel, stem: st, title, ntype, status, body });
        }
    }
    out
}

#[tauri::command]
pub fn graph_build(state: State<AppState>) -> Result<Graph, String> {
    let root = state.vault_root.lock().unwrap().clone().ok_or("vault root not set")?;
    let rp = PathBuf::from(&root);
    let pages = collect_pages(&rp);

    let mut index: HashMap<String, String> = HashMap::new();
    for p in &pages {
        index.insert(p.stem.to_lowercase(), p.rel.clone());
        index.insert(p.title.to_lowercase(), p.rel.clone());
    }

    let mut nodes = vec![];
    let mut links = vec![];
    for p in &pages {
        nodes.push(GraphNode {
            id: p.rel.clone(),
            path: p.rel.clone(),
            title: p.title.clone(),
            node_type: p.ntype.clone(),
            status: p.status.clone(),
        });
        for cap in WIKILINK_RE.captures_iter(&p.body) {
            let target = cap.get(1).unwrap().as_str().trim().to_lowercase();
            if let Some(tpath) = index.get(&target) {
                if tpath != &p.rel {
                    links.push(GraphLink { source: p.rel.clone(), target: tpath.clone() });
                }
            }
        }
    }
    Ok(Graph { nodes, links })
}

#[tauri::command]
pub fn backlinks(state: State<AppState>, target_path: String) -> Result<Vec<GraphNode>, String> {
    let root = state.vault_root.lock().unwrap().clone().ok_or("vault root not set")?;
    let rp = PathBuf::from(&root);
    let pages = collect_pages(&rp);
    let target_stem = Path::new(&target_path).file_stem().map(|s| s.to_string_lossy().to_lowercase()).unwrap_or_default();
    let mut out = vec![];
    for p in &pages {
        if p.rel == target_path { continue; }
        for cap in WIKILINK_RE.captures_iter(&p.body) {
            let t = cap.get(1).unwrap().as_str().trim().to_lowercase();
            if t == target_stem {
                out.push(GraphNode {
                    id: p.rel.clone(),
                    path: p.rel.clone(),
                    title: p.title.clone(),
                    node_type: p.ntype.clone(),
                    status: p.status.clone(),
                });
                break;
            }
        }
    }
    Ok(out)
}
