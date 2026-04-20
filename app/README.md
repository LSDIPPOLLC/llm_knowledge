# ideallm desktop app

Tauri + React + CodeMirror 6 desktop client for the ideallm LLM-Wiki.

Obsidian-style look/feel: file tree, tabbed markdown editor with live preview, `[[wikilink]]` navigation, graph view, backlinks, command palette, and one-click AI ops (ingest / sync / lint / deprecate / query) that shell out to the `claude` CLI.

## Requirements

- Node 20+, pnpm 10+
- Rust stable
- Linux build deps: `libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
- `claude` CLI and `python3` on PATH (for ops / search)
- GUI host (WSLg, Xorg, Wayland, macOS, Windows)

## Dev

```bash
cd app
pnpm install
pnpm tauri dev
```

On first launch use the top-bar folder button to pick the repo root (`/path/to/ideallm`). The app scans `raw/` and `wiki/` subdirs.

## Build

```bash
pnpm tauri build      # AppImage + .deb on Linux
```

Cross-compile from WSL to Windows is not reliable; build on Windows host for `.msi`/`.exe`.

## Keybindings

| Key | Action |
|-----|--------|
| ⌘P | Command palette (file jump + actions) |
| ⌘⇧G | Graph view |
| ⌘⇧F | Search panel |
| ⌘E | Cycle edit / split / preview |
| ⌘S | Save current file |
| ⌘-click `[[wikilink]]` (in editor) | Jump to target |

## Architecture

- `src-tauri/` Rust backend — vault scan, atomic writes, graph build, subprocess ops streaming via Tauri events (`ops:chunk`, `ops:exit`).
- `src/` React + Zustand frontend — CodeMirror 6 for the editor, `unified/remark/rehype` for preview, `react-force-graph-2d` for the graph.
- Ops panel matches `WIKI_SCHEMA.md` operations exactly: `ingest <path>`, `sync [path]`, `lint`, `deprecate <path>`, free-form query. Search uses existing `.claude/wiki_query.py --json`.
