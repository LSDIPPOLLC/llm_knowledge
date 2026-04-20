import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import { useOps } from "../state/ops";
import { useTabs } from "../state/tabs";
import { useVault } from "../state/vault";

const OPS = [
  { kind: "lint", label: "lint", needsArg: false },
  { kind: "sync", label: "sync raw", needsArg: false },
  { kind: "ingest", label: "ingest", needsArg: true, hint: "raw/articles/file.md" },
  { kind: "deprecate", label: "deprecate", needsArg: true, hint: "wiki/concepts/old.md" },
  { kind: "query", label: "ask", needsArg: true, hint: "pose a question…" },
];

export function OpsPanel() {
  const { runs, activeId, setActive, run, cancel } = useOps();
  const activeTab = useTabs((s) => s.tabs.find((t) => t.path === s.active));
  const refresh = useVault((s) => s.refresh);
  const [arg, setArg] = useState("");
  const [kind, setKind] = useState("lint");
  const [runError, setRunError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const active = runs.find((r) => r.id === activeId);

  useEffect(() => {
    if (!active) return;
    if (active.exitCode !== null) refresh();
  }, [active?.exitCode]);

  const op = OPS.find((o) => o.kind === kind)!;

  const effectiveArg = () => {
    if (kind === "ingest" && !arg && activeTab?.path.startsWith("raw/")) return activeTab.path;
    if (kind === "deprecate" && !arg && activeTab?.path.startsWith("wiki/")) return activeTab.path;
    return arg;
  };

  const onRun = async () => {
    if (submitting) return;
    setSubmitting(true);
    setRunError(null);
    try {
      await run(kind, effectiveArg());
    } catch (e: any) {
      const msg = String(e?.message || e || "unknown error");
      setRunError(
        msg.toLowerCase().includes("no such file") || msg.includes("ENOENT") || msg.toLowerCase().includes("not found")
          ? `could not launch. ensure \`claude\` and \`python\` are on PATH and the vault root is correct.`
          : msg
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ops-panel" role="region" aria-label="operations">
      <div className="ops-controls">
        <label htmlFor="ops-kind" className="visually-hidden">operation</label>
        <select id="ops-kind" value={kind} onChange={(e) => { setKind(e.target.value); setRunError(null); }}>
          {OPS.map((o) => <option key={o.kind} value={o.kind}>{o.label}</option>)}
        </select>
        {op.needsArg && (
          <>
            <label htmlFor="ops-arg" className="visually-hidden">{op.label} argument</label>
            <input
              id="ops-arg"
              placeholder={op.hint}
              value={arg}
              onChange={(e) => setArg(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              maxLength={2000}
              onKeyDown={(e) => { if (e.key === "Enter") onRun(); }}
            />
          </>
        )}
        <button onClick={onRun} disabled={submitting}>
          <Play size={11} aria-hidden="true" /> run
        </button>
        {active && active.exitCode === null && (
          <button onClick={() => cancel(active.id)}>
            <Square size={11} aria-hidden="true" /> cancel
          </button>
        )}
        <div className="ops-runs" role="list" aria-label="recent runs">
          {runs.slice(-6).map((r) => (
            <button
              key={r.id}
              type="button"
              role="listitem"
              className={"run-chip" + (r.id === activeId ? " active" : "")}
              aria-pressed={r.id === activeId}
              onClick={() => setActive(r.id)}
            >
              {r.kind}{r.arg ? ` · ${r.arg.slice(0, 20)}` : ""}
              {r.exitCode === null
                ? <span className="pulse-dashes"> <i>—</i><i>—</i><i>—</i></span>
                : r.exitCode === 0 ? " §" : " ✗"}
            </button>
          ))}
        </div>
      </div>
      {runError && (
        <div className="op-error" role="alert">
          <strong>run failed.</strong> {runError}
        </div>
      )}
      <div className="ops-output" aria-live="polite" aria-atomic="false">
        {active ? (
          active.lines.length
            ? active.lines.map((l, i) => (
                <div key={i} className={"op-line " + l.stream}>{l.data}</div>
              ))
            : <div className="op-empty">
                <span className="pulse-dashes"><i>—</i><i>—</i><i>—</i></span>
                &nbsp; awaiting first line
              </div>
        ) : (
          <div className="op-empty">pick an operation and set it in motion. the press waits.</div>
        )}
      </div>
    </div>
  );
}
