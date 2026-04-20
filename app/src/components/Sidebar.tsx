import { useEffect, useMemo, useState, KeyboardEvent } from "react";
import { api, GraphNode } from "../lib/api";
import { useTabs } from "../state/tabs";
import { parseMd } from "../lib/frontmatter";

function activateOnKey(e: KeyboardEvent, cb: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    cb();
  }
}

export function Sidebar() {
  const activePath = useTabs((s) => s.active);
  const tab = useTabs((s) => s.tabs.find((t) => t.path === s.active));
  const openPath = useTabs((s) => s.openPath);
  const [backs, setBacks] = useState<GraphNode[]>([]);

  const isGraph = !activePath || activePath === "__graph__";

  useEffect(() => {
    if (isGraph) { setBacks([]); return; }
    let cancelled = false;
    api.backlinks(activePath!)
      .then((b) => { if (!cancelled) setBacks(b); })
      .catch(() => { if (!cancelled) setBacks([]); });
    return () => { cancelled = true; };
  }, [activePath, tab?.mtime, isGraph]);

  const { fm, outline } = useMemo(() => {
    if (!tab || isGraph) {
      return { fm: null as Record<string, any> | null, outline: [] as { level: number; text: string }[] };
    }
    let fm: Record<string, any> | null = null;
    try { fm = parseMd(tab.content).frontmatter; } catch { fm = null; }
    const outline: { level: number; text: string }[] = [];
    const lines = tab.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(#{1,6})\s+(.+)$/);
      if (m) outline.push({ level: m[1].length, text: m[2].trim() });
    }
    return { fm, outline };
  }, [tab?.content, isGraph]);

  if (isGraph) {
    return (
      <aside className="sidebar" aria-label="marginalia">
        <div className="sidebar-empty">
          no page in view. pick an entry from the contents on the left to populate the margin.
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label="marginalia">
      {fm && (
        <section className="sb-section" aria-labelledby="sb-fm">
          <h3 id="sb-fm" className="sb-title"><span>marginalia</span></h3>
          <div className="fm-block small">
            {Object.entries(fm).map(([k, v]) => (
              <div key={k} className="fm-row">
                <span className="fm-key">{k}</span>
                <span className="fm-val">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="sb-section" aria-labelledby="sb-outline">
        <h3 id="sb-outline" className="sb-title">
          <span>outline</span>
          {outline.length > 0 && <span className="count">{outline.length}</span>}
        </h3>
        {outline.length ? outline.map((o, i) => (
          <div
            key={i}
            className="sb-outline-item"
            style={{ paddingLeft: 4 + (o.level - 1) * 12 }}
          >
            {o.text}
          </div>
        )) : <div className="sb-empty">no headings yet</div>}
      </section>

      <section className="sb-section" aria-labelledby="sb-back">
        <h3 id="sb-back" className="sb-title">
          <span>cited by</span>
          <span className="count">{backs.length}</span>
        </h3>
        {backs.length ? backs.map((b) => (
          <div
            key={b.path}
            role="link"
            tabIndex={0}
            aria-label={`open ${b.title}`}
            className="sb-back"
            onClick={() => openPath(b.path)}
            onKeyDown={(e) => activateOnKey(e, () => openPath(b.path))}
          >
            <div>{b.title}</div>
            <div className="sb-back-path">{b.path}</div>
          </div>
        )) : <div className="sb-empty">no inbound links</div>}
      </section>
    </aside>
  );
}
