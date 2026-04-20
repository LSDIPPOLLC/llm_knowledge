import { useEffect, useMemo, useState } from "react";
import { mdToReact } from "../lib/markdown";
import { parseMd } from "../lib/frontmatter";
import { useTabs } from "../state/tabs";
import { useVault } from "../state/vault";

export function Preview({ path }: { path: string }) {
  const tab = useTabs((s) => s.tabs.find((t) => t.path === path)!);
  const openPath = useTabs((s) => s.openPath);
  const resolve = useVault((s) => s.resolveWikilink);

  // Debounce the content used for rendering to avoid re-parsing on every keystroke.
  const [debounced, setDebounced] = useState(tab.content);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(tab.content), 150);
    return () => clearTimeout(h);
  }, [tab.content]);

  const rendered = useMemo(() => {
    try {
      const { body, frontmatter } = parseMd(debounced);
      const tree = mdToReact(body, (target) => {
        const resolved = resolve(target);
        if (resolved) openPath(resolved);
      });
      return { frontmatter, tree, error: null as string | null };
    } catch (e: any) {
      return { frontmatter: null, tree: null, error: String(e?.message || e) };
    }
  }, [debounced, resolve, openPath]);

  return (
    <div className="preview-pane" aria-label="preview">
      {rendered.error && (
        <div className="search-error" role="alert">
          <strong>preview failed to render.</strong> {rendered.error}
        </div>
      )}
      {rendered.frontmatter && (
        <div className="fm-block">
          {Object.entries(rendered.frontmatter).map(([k, v]) => (
            <div key={k} className="fm-row">
              <span className="fm-key">{k}</span>
              <span className="fm-val">
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="md-body">{rendered.tree}</div>
    </div>
  );
}
