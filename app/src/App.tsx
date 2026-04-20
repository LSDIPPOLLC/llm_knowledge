import { lazy, Suspense, useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Network, Columns, Edit3, Eye, PanelLeft, PanelRight, X, Sun, Moon, Contrast } from "lucide-react";
import { FileTree } from "./components/FileTree";
import { TabBar } from "./components/TabBar";
import { Sidebar } from "./components/Sidebar";
import { api } from "./lib/api";

const Editor = lazy(() => import("./components/Editor").then((m) => ({ default: m.Editor })));
const Preview = lazy(() => import("./components/Preview").then((m) => ({ default: m.Preview })));
const GraphView = lazy(() => import("./components/GraphView").then((m) => ({ default: m.GraphView })));
const CommandPalette = lazy(() => import("./components/CommandPalette").then((m) => ({ default: m.CommandPalette })));
const OpsPanel = lazy(() => import("./components/OpsPanel").then((m) => ({ default: m.OpsPanel })));
const SearchOverlay = lazy(() => import("./components/SearchPanel").then((m) => ({ default: m.SearchOverlay })));

const LazyFallback = () => (
  <div className="op-empty" style={{ padding: 24 }}>
    <span className="pulse-dashes"><i>—</i><i>—</i><i>—</i></span>
  </div>
);
import { SaveFlourish } from "./components/SaveFlourish";
import { VaultMenu } from "./components/VaultMenu";
import { useVault } from "./state/vault";
import { useRecent } from "./state/recent";
import { useTabs } from "./state/tabs";
import { useOps } from "./state/ops";
import { useTheme, initThemeListener } from "./state/theme";
import { DEKS, roman, pickByHour, sessionPick } from "./lib/delight";

const ISSUE_DATE = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" })
      .format(new Date())
      .toLowerCase();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
})();

function inEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (el.closest?.(".cm-editor")) return true;
  return false;
}
const WELCOME_DEK = sessionPick(DEKS);
const MASTHEAD_TAG = pickByHour([
  "a personal llm wiki",
  "a commonplace book",
  "a slow record",
  "an archive in progress",
]);

function useMediaQuery(q: string) {
  const [match, setMatch] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(q).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(q);
    const h = () => setMatch(mql.matches);
    mql.addEventListener("change", h);
    return () => mql.removeEventListener("change", h);
  }, [q]);
  return match;
}

export default function App() {
  const { root, tree, loadRoot } = useVault();
  const { tabs, active, openGraphTab, setMode } = useTabs();
  const activeTab = tabs.find((t) => t.path === active);
  const [bottom, setBottom] = useState<"ops" | null>("ops");
  const [searchOpen, setSearchOpen] = useState(false);

  const isNarrow = useMediaQuery("(max-width: 1199px)");
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [leftOpen, setLeftOpen] = useState(!isNarrow);
  const [rightOpen, setRightOpen] = useState(!isNarrow);

  useEffect(() => {
    if (isMobile) { setLeftOpen(false); setRightOpen(false); }
    else if (isNarrow) { setRightOpen(false); setLeftOpen(true); }
    else { setLeftOpen(true); setRightOpen(true); }
  }, [isNarrow, isMobile]);

  useEffect(() => { useOps.getState().init(); }, []);
  useEffect(() => initThemeListener(), []);
  const themeMode = useTheme((s) => s.mode);
  const themeResolved = useTheme((s) => s.resolved);
  const cycleTheme = useTheme((s) => s.cycle);
  const ThemeIcon = themeMode === "light" ? Sun : themeMode === "dark" ? Moon : Contrast;
  const themeTitle = `theme: ${themeMode}${themeMode === "auto" ? ` (${themeResolved})` : ""} — click to cycle`;

  useEffect(() => {
    if (root) return;
    (async () => {
      try {
        const current = await api.getVaultRoot();
        if (current) { await loadRoot(current); return; }
        const recent = useRecent.getState().list;
        if (recent.length) {
          try { await loadRoot(recent[0].path); } catch { /* stale path */ }
        }
      } catch {}
    })();
  }, []);

  const pickVault = async () => {
    const picked = await openDialog({ directory: true, multiple: false });
    if (typeof picked === "string") await loadRoot(picked);
  };

  const onKey = (e: React.KeyboardEvent) => {
    // ⌘⇧G, ⌘⇧F, ⌘E are app-wide and override input context intentionally.
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "g") {
      e.preventDefault(); openGraphTab(); return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
      e.preventDefault(); setSearchOpen((o) => !o); return;
    }
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "e" && activeTab) {
      if (inEditableTarget(e.target)) return;
      e.preventDefault();
      const next = activeTab.mode === "edit" ? "preview" : activeTab.mode === "preview" ? "split" : "edit";
      setMode(activeTab.path, next);
    }
  };

  const pageCount = tree.reduce((n, t) => n + countFiles(t), 0);
  const vol = roman(Math.max(1, pageCount));

  return (
    <div className="app" tabIndex={0} onKeyDown={onKey}>
      <div className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="rail-toggle"
            aria-label={leftOpen ? "hide contents" : "show contents"}
            aria-expanded={leftOpen}
            onClick={() => setLeftOpen((o) => !o)}
          >
            <PanelLeft size={14} aria-hidden="true" />
          </button>
          <h1 className="brand" aria-label="ideallm">ide<em>a</em>llm</h1>
        </div>
        <div className="masthead-meta">
          <span title={`${pageCount} pages in vault`}>vol. {vol}</span>
          <span className="sep" aria-hidden="true">·</span>
          <span className="m-tag">{MASTHEAD_TAG}</span>
          <span className="sep" aria-hidden="true">·</span>
          <span className="m-date">{ISSUE_DATE}</span>
          <span className="sep m-vault-sep" aria-hidden="true">·</span>
          <VaultMenu />
        </div>
        <div className="top-actions">
          <button
            type="button"
            onClick={cycleTheme}
            title={themeTitle}
            aria-label={themeTitle}
            className="theme-toggle"
          >
            <ThemeIcon size={12} aria-hidden="true" />
            <span className="btn-label btn-label-theme">{themeMode}</span>
          </button>
          <button onClick={openGraphTab} title="Graph (⌘⇧G)" aria-label="open graph view"><Network size={12} aria-hidden="true" /> <span className="btn-label">graph</span></button>
          {activeTab && activeTab.path !== "__graph__" && (
            <div className="mode-switch" role="group" aria-label="view mode">
              <button className={activeTab.mode === "edit" ? "on" : ""} onClick={() => setMode(activeTab.path, "edit")} title="Edit (⌘E)" aria-label="edit only"><Edit3 size={11} aria-hidden="true" /></button>
              <button className={activeTab.mode === "split" ? "on" : ""} onClick={() => setMode(activeTab.path, "split")} title="Split" aria-label="split view"><Columns size={11} aria-hidden="true" /></button>
              <button className={activeTab.mode === "preview" ? "on" : ""} onClick={() => setMode(activeTab.path, "preview")} title="Preview" aria-label="preview only"><Eye size={11} aria-hidden="true" /></button>
            </div>
          )}
          <button
            type="button"
            className="rail-toggle"
            aria-label={rightOpen ? "hide margin" : "show margin"}
            aria-expanded={rightOpen}
            onClick={() => setRightOpen((o) => !o)}
          >
            <PanelRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className={
          "workbench" +
          (isNarrow ? " is-narrow" : "") +
          (isMobile ? " is-mobile" : "") +
          (leftOpen ? " left-open" : "") +
          (rightOpen ? " right-open" : "")
        }
      >
        {(isMobile || (isNarrow && (leftOpen || rightOpen))) && (leftOpen || rightOpen) && (
          <div
            className="rail-scrim"
            onClick={() => { setLeftOpen(false); setRightOpen(false); }}
            aria-hidden="true"
          />
        )}
        <aside className="left-rail" aria-label="contents">
          <div className="rail-heading">
            <span>contents</span>
            <span className="count">{pageCount} entries</span>
            {isNarrow && (
              <button
                type="button"
                className="rail-close"
                aria-label="close contents"
                onClick={() => setLeftOpen(false)}
              >
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </div>
          <FileTree tree={tree} />
        </aside>

        <div className="center">
          <TabBar />
          <div className="content">
            {!activeTab && (
              <div className="welcome">
                <div className="colophon">colophon · no. 1</div>
                <h2>a wiki, <em>slowly</em> compiled</h2>
                <p className="dek">{WELCOME_DEK}</p>
                <dl>
                  <dt>⌘ P</dt><dd>goto file or command</dd>
                  <dt>⌘ ⇧ G</dt><dd>map of the archive</dd>
                  <dt>⌘ ⇧ F</dt><dd>search wiki + raw</dd>
                  <dt>⌘ E</dt><dd>cycle edit · split · preview</dd>
                  <dt>⌘ S</dt><dd>set in ink</dd>
                  <dt>⌘ click</dt><dd>follow a [[wikilink]]</dd>
                </dl>
                <button onClick={pickVault}><FolderOpen size={12} /> pick vault directory</button>
              </div>
            )}
            {activeTab?.path === "__graph__" && (
              <Suspense fallback={<LazyFallback />}><GraphView /></Suspense>
            )}
            {activeTab && activeTab.path !== "__graph__" && (
              <div className={"doc mode-" + activeTab.mode}>
                {(activeTab.mode === "edit" || activeTab.mode === "split") && (
                  <Suspense fallback={<LazyFallback />}>
                    <Editor path={activeTab.path} />
                  </Suspense>
                )}
                {(activeTab.mode === "preview" || activeTab.mode === "split") && (
                  <Suspense fallback={<LazyFallback />}>
                    <Preview path={activeTab.path} />
                  </Suspense>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="right-rail">
          {isNarrow && (
            <button
              type="button"
              className="rail-close rail-close-float"
              aria-label="close margin"
              onClick={() => setRightOpen(false)}
            >
              <X size={12} aria-hidden="true" />
            </button>
          )}
          <Sidebar />
        </div>
      </div>

      <div className="bottom">
        <div className="bottom-tabs">
          <button className={bottom === "ops" ? "on" : ""} onClick={() => setBottom(bottom === "ops" ? null : "ops")}>workbench</button>
          <button className="ghost" onClick={() => setSearchOpen(true)} title="search (⌘⇧F)">search <kbd>⌘⇧F</kbd></button>
          <span className="workbench-mark">§ appendix</span>
        </div>
        {bottom === "ops" && (
          <Suspense fallback={<LazyFallback />}><OpsPanel /></Suspense>
        )}
      </div>

      <Suspense fallback={null}><CommandPalette /></Suspense>
      <Suspense fallback={null}>
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      </Suspense>
      <SaveFlourish />
    </div>
  );
}

function countFiles(n: { is_dir: boolean; children: any[] }): number {
  if (!n.is_dir) return 1;
  return n.children.reduce((s, c) => s + countFiles(c), 0);
}
