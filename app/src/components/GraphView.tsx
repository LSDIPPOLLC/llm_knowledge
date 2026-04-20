import { useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useVault } from "../state/vault";
import { useTabs } from "../state/tabs";
import { useTheme } from "../state/theme";
import { jitterAngle } from "../lib/delight";

function tokenColor(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const COLOR_VARS: { key: string; label: string; cssVar: string }[] = [
  { key: "concept",         label: "concept",    cssVar: "--graph-color-concept" },
  { key: "entity",          label: "entity",     cssVar: "--graph-color-entity" },
  { key: "source-summary",  label: "source",     cssVar: "--graph-color-source" },
  { key: "comparison",      label: "comparison", cssVar: "--graph-color-comparison" },
  { key: "reflection",      label: "reflection", cssVar: "--graph-color-reflection" },
  { key: "raw",             label: "raw",        cssVar: "--graph-color-raw" },
  { key: "page",            label: "page",       cssVar: "--graph-color-page" },
];

export function GraphView() {
  const graph = useVault((s) => s.graph);
  const openPath = useTabs((s) => s.openPath);
  const resolved = useTheme((s) => s.resolved);
  const ref = useRef<any>(null);
  const [filter, setFilter] = useState<string>("");

  // Resolve palette from CSS custom props; re-run when theme flips.
  const palette = useMemo(() => {
    const out: Record<string, string> = {};
    for (const v of COLOR_VARS) {
      out[v.key] = tokenColor(v.cssVar) || "#7a6e5d";
    }
    return out;
  }, [resolved]);

  const labelColor = useMemo(() => tokenColor("--graph-label"), [resolved]);
  const linkColor = useMemo(() => tokenColor("--graph-link"), [resolved]);

  const data = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };
    const nodes = graph.nodes
      .filter((n) => !filter || n.node_type === filter)
      .map((n) => ({
        id: n.id,
        path: n.path,
        title: n.title,
        node_type: n.node_type,
        status: n.status,
        color: palette[n.node_type] || palette.page,
      }));
    const ids = new Set(nodes.map((n) => n.id));
    const srcId = (v: any) => (typeof v === "object" && v !== null ? v.id : v);
    const links = graph.links
      .map((l) => ({ source: srcId(l.source), target: srcId(l.target) }))
      .filter((l) => ids.has(l.source) && ids.has(l.target));
    return { nodes, links };
  }, [graph, filter, palette]);

  return (
    <div className="graph-view">
      <div className="graph-toolbar">
        <button onClick={() => setFilter("")} className={!filter ? "on" : ""}>all</button>
        {COLOR_VARS.map((v) => (
          <button key={v.key} onClick={() => setFilter(v.key)} className={filter === v.key ? "on" : ""}>
            <span className="dot" style={{ background: palette[v.key] }} />
            {v.label}
          </button>
        ))}
        <span className="graph-stats">{data.nodes.length} nodes · {data.links.length} links</span>
      </div>
      <div className="graph-canvas">
        <ForceGraph2D
          ref={ref}
          graphData={data as any}
          backgroundColor="transparent"
          nodeLabel={(n: any) => `${n.title} · ${n.node_type}`}
          nodeRelSize={3.5}
          linkColor={() => linkColor}
          linkWidth={0.8}
          onNodeClick={(n: any) => openPath(n.path)}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node: any, ctx, scale) => {
            const fs = 11 / scale;
            ctx.save();
            ctx.translate(node.x, node.y + 10);
            ctx.rotate((jitterAngle(node.id) * Math.PI) / 180);
            ctx.font = `italic ${fs}px "Fraunces", serif`;
            ctx.fillStyle = labelColor;
            ctx.textAlign = "center";
            ctx.fillText(node.title, 0, 0);
            ctx.restore();
          }}
        />
      </div>
    </div>
  );
}
