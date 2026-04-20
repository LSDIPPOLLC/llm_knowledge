import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { Search, X, FileText } from "lucide-react";
import { api } from "../lib/api";
import { useTabs } from "../state/tabs";

type Scope = "all" | "pages" | "sources" | "domains" | "recent";

interface Hit {
  line_number: number;
  line: string;
  context: string;
  file: string;
  relative_path: string;
  match_count: number;
}

interface Payload {
  term: string;
  total_matches: number;
  files_searched: number;
  results: Hit[];
}

const SCOPES: { key: Scope; label: string }[] = [
  { key: "all", label: "all" },
  { key: "pages", label: "wiki" },
  { key: "sources", label: "raw" },
  { key: "domains", label: "domains" },
  { key: "recent", label: "log" },
];

function escapeRegex(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function highlight(text: string, term: string): (string | JSX.Element)[] {
  if (!term) return [text];
  const re = new RegExp(`(${escapeRegex(term)})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    i % 2 === 1 ? <mark key={i} className="hl">{p}</mark> : p
  );
}

function truncateCtx(ctx: string, line: string): string {
  const lines = ctx.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return line;
  const idx = lines.findIndex((l) => l.includes(line.trim()));
  if (idx < 0) return lines.join(" · ");
  const start = Math.max(0, idx - 1);
  const end = Math.min(lines.length, idx + 2);
  return lines.slice(start, end).join(" · ");
}

export interface SearchPanelProps {
  onClose?: () => void;
}

export function SearchPanel({ onClose }: SearchPanelProps = {}) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const openPath = useTabs((s) => s.openPath);
  const inflight = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!q.trim()) { setPayload(null); setError(null); return; }
    const token = ++inflight.current;
    const h = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const raw = await api.searchWiki(q, scope === "all" ? undefined : scope);
        if (token !== inflight.current) return;
        try {
          const data = JSON.parse(raw) as Payload;
          setPayload(data);
          setFocusIdx(data.results.length ? 0 : -1);
          setCollapsed(new Set());
        } catch {
          setError("could not parse response.");
          setPayload(null);
        }
      } catch (e: any) {
        if (token !== inflight.current) return;
        setError(String(e?.message || e));
        setPayload(null);
      } finally {
        if (token === inflight.current) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(h);
  }, [q, scope]);

  const grouped = useMemo(() => {
    if (!payload) return [];
    const by: Record<string, { path: string; hits: Hit[]; total: number }> = {};
    for (const r of payload.results) {
      const key = r.relative_path;
      if (!by[key]) by[key] = { path: key, hits: [], total: r.match_count };
      by[key].hits.push(r);
    }
    return Object.values(by).sort((a, b) => b.total - a.total);
  }, [payload]);

  const flat = useMemo(() => {
    const arr: { group: string; hit: Hit }[] = [];
    for (const g of grouped) {
      if (collapsed.has(g.path)) continue;
      for (const h of g.hits) arr.push({ group: g.path, hit: h });
    }
    return arr;
  }, [grouped, collapsed]);

  const open = (path: string) => {
    openPath(path);
    onClose?.();
  };

  const onListKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const h = flat[focusIdx];
      if (h) open(h.group);
    } else if (e.key === "Escape") {
      if (q) { e.preventDefault(); setQ(""); }
      else onClose?.();
    } else if (e.key === "Tab" && !e.shiftKey) {
      // cycle scope with Tab when input focused
      if (document.activeElement === inputRef.current) {
        e.preventDefault();
        const i = SCOPES.findIndex((s) => s.key === scope);
        setScope(SCOPES[(i + 1) % SCOPES.length].key);
      }
    }
  };

  useEffect(() => {
    if (focusIdx < 0) return;
    const el = listRef.current?.querySelector(`[data-hit-idx="${focusIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [focusIdx]);

  const toggleGroup = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  const clear = () => { setQ(""); setPayload(null); setError(null); inputRef.current?.focus(); };

  return (
    <div className="search-panel" role="search" onKeyDown={onListKey}>
      <div className="search-input">
        <Search size={16} aria-hidden="true" />
        <label htmlFor="search-q" className="visually-hidden">search wiki and raw sources</label>
        <input
          id="search-q"
          ref={inputRef}
          placeholder="consult the wiki…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          maxLength={500}
          aria-describedby="search-summary"
        />
        {q && (
          <button type="button" className="search-clear" onClick={clear} aria-label="clear search">
            <X size={14} aria-hidden="true" />
          </button>
        )}
        {onClose && (
          <button type="button" className="search-dismiss" onClick={onClose} aria-label="close search">
            <kbd>esc</kbd>
          </button>
        )}
      </div>

      <div className="search-scopes" role="tablist" aria-label="search scope">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={scope === s.key}
            className={"scope-tab" + (scope === s.key ? " on" : "")}
            onClick={() => setScope(s.key)}
          >
            {s.label}
          </button>
        ))}
        <div id="search-summary" className="search-summary" aria-live="polite">
          {loading && <span className="pulse-dashes"><i>—</i><i>—</i><i>—</i></span>}
          {!loading && payload && (
            <span>
              <strong>{payload.total_matches}</strong>{" "}
              {payload.total_matches === 1 ? "match" : "matches"} in{" "}
              <strong>{payload.files_searched}</strong>{" "}
              {payload.files_searched === 1 ? "file" : "files"}
            </span>
          )}
        </div>
      </div>

      <div className="search-results" ref={listRef}>
        {error && (
          <div className="search-error" role="alert">
            <strong>search failed.</strong> {error}.
            <div className="hint">
              check that <code>python3</code> (or <code>python</code>) and{" "}
              <code>.claude/wiki_query.py</code> are available in the vault root.
            </div>
          </div>
        )}

        {!loading && !error && !q.trim() && (
          <div className="search-hint">
            <div className="hint-line">type to consult the archive.</div>
            <div className="hint-sub">scope tabs filter to wiki pages, raw sources, domain index, or the activity log.</div>
            <div className="hint-keys">
              <kbd>↑</kbd><kbd>↓</kbd> navigate · <kbd>enter</kbd> open · <kbd>tab</kbd> cycle scope · <kbd>esc</kbd> clear / close
            </div>
          </div>
        )}

        {!loading && !error && q.trim() && payload && payload.results.length === 0 && (
          <div className="search-empty">
            nothing catalogued under <em>{q}</em>
            {scope !== "all" && <> in <em>{SCOPES.find((s) => s.key === scope)?.label}</em></>}.
          </div>
        )}

        {!loading && !error && grouped.length > 0 && (() => {
          let idxCounter = 0;
          return grouped.map((g) => {
            const isCollapsed = collapsed.has(g.path);
            return (
              <div key={g.path} className="search-group">
                <button
                  type="button"
                  className="search-group-head"
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleGroup(g.path)}
                >
                  <FileText size={12} aria-hidden="true" />
                  <span className="group-path">{g.path}</span>
                  <span className="group-count">{g.hits.length}</span>
                </button>
                {!isCollapsed && g.hits.map((h) => {
                  const idx = idxCounter++;
                  const focused = idx === focusIdx;
                  return (
                    <div
                      key={`${g.path}:${h.line_number}`}
                      className={"search-hit" + (focused ? " focused" : "")}
                      role="link"
                      tabIndex={0}
                      data-hit-idx={idx}
                      onClick={() => open(g.path)}
                      onMouseEnter={() => setFocusIdx(idx)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open(g.path);
                        }
                      }}
                    >
                      <span className="hit-lineno">{h.line_number}</span>
                      <div className="hit-body">
                        <div className="hit-line">{highlight(h.line, q)}</div>
                        {h.context && h.context.trim() !== h.line.trim() && (
                          <div className="hit-ctx">{highlight(truncateCtx(h.context, h.line), q)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="search">
      <div className="search-overlay-scrim" onClick={onClose} aria-hidden="true" />
      <div className="search-overlay-frame">
        <div className="search-overlay-colophon">
          <span>§ search</span>
          <span className="sep" aria-hidden="true">·</span>
          <span className="muted">the full archive</span>
        </div>
        <SearchPanel onClose={onClose} />
      </div>
    </div>
  );
}
