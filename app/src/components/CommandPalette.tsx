import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";
import { useVault } from "../state/vault";
import { useTabs } from "../state/tabs";
import { useOps } from "../state/ops";
import { CMDK_EMPTIES } from "../lib/delight";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const graph = useVault((s) => s.graph);
  const openPath = useTabs((s) => s.openPath);
  const openGraph = useTabs((s) => s.openGraphTab);
  const run = useOps((s) => s.run);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p" && !e.shiftKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const emptyLine = useMemo(
    () => CMDK_EMPTIES[Math.floor(Math.random() * CMDK_EMPTIES.length)],
    [open]
  );

  if (!open) return null;
  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div className="cmdk-modal" onClick={(e) => e.stopPropagation()}>
        <Command shouldFilter>
          <Command.Input
            placeholder="jump to a page, or pose a question…"
            value={q}
            onValueChange={setQ}
            autoFocus
          />
          <Command.List>
            <Command.Empty>
              <div className="cmdk-empty">{emptyLine}</div>
            </Command.Empty>
            <Command.Group heading="operations">
              <Command.Item onSelect={() => { openGraph(); setOpen(false); }}>
                <span className="cmdk-title">open graph</span>
                <span className="cmdk-path">⌘⇧G</span>
              </Command.Item>
              <Command.Item onSelect={() => { run("lint", ""); setOpen(false); }}>
                <span className="cmdk-title">lint the wiki</span>
                <span className="cmdk-path">claude · lint</span>
              </Command.Item>
              <Command.Item onSelect={() => { run("sync", ""); setOpen(false); }}>
                <span className="cmdk-title">sync raw</span>
                <span className="cmdk-path">claude · sync</span>
              </Command.Item>
              {q && (
                <Command.Item onSelect={() => { run("query", q); setOpen(false); }}>
                  <span className="cmdk-title">ask claude: <em style={{ color: "var(--oxblood)" }}>{q}</em></span>
                </Command.Item>
              )}
            </Command.Group>
            <Command.Group heading="pages">
              {graph?.nodes.map((n) => (
                <Command.Item
                  key={n.path}
                  value={`${n.title} ${n.path}`}
                  onSelect={() => { openPath(n.path); setOpen(false); }}
                >
                  <span className="cmdk-title">{n.title}</span>
                  <span className="cmdk-path">{n.path}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
