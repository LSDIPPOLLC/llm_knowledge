import { useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useVault } from "../state/vault";
import { useTabs } from "../state/tabs";
import { jitterAngle } from "../lib/delight";

const COLORS: Record<string, string> = {
  concept: "#b23a2a",         // oxblood
  entity: "#a6833b",          // brass
  "source-summary": "#8a6f4a", // umber
  comparison: "#6b7d5e",       // sage
  reflection: "#3a3229",       // ink-soft
  raw: "#c9bda1",              // rule
  page: "#7a6e5d",             // ink-dim
};

export function GraphView() {
  const graph = useVault((s) => s.graph);
  const openPath = useTabs((s) => s.openPath);
  const ref = useRef<any>(null);
  const [filter, setFilter] = useState<string>("");

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
        color: COLORS[n.node_type] || "#7a6e5d",
      }));
    const ids = new Set(nodes.map((n) => n.id));
    // force-graph mutates link source/target from string ids into node refs
    // after first render. Re-normalise to string ids every time we filter so
    // the subset calculation stays correct across filter switches.
    const srcId = (v: any) => (typeof v === "object" && v !== null ? v.id : v);
    const links = graph.links
      .map((l) => ({ source: srcId(l.source), target: srcId(l.target) }))
      .filter((l) => ids.has(l.source) && ids.has(l.target));
    return { nodes, links };
  }, [graph, filter]);

  return (
    <div className="graph-view">
      <div className="graph-toolbar">
        <button onClick={() => setFilter("")} className={!filter ? "on" : ""}>all</button>
        {Object.keys(COLORS).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={filter === k ? "on" : ""}>
            <span className="dot" style={{ background: COLORS[k] }} />{k.replace("-", " ")}
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
          linkColor={() => "rgba(122,110,93,0.35)"}
          linkWidth={0.8}
          onNodeClick={(n: any) => openPath(n.path)}
          nodeCanvasObjectMode={() => "after"}
          nodeCanvasObject={(node: any, ctx, scale) => {
            const fs = 11 / scale;
            ctx.save();
            ctx.translate(node.x, node.y + 10);
            ctx.rotate((jitterAngle(node.id) * Math.PI) / 180);
            ctx.font = `italic ${fs}px "Fraunces", serif`;
            ctx.fillStyle = "rgba(26,23,20,0.82)";
            ctx.textAlign = "center";
            ctx.fillText(node.title, 0, 0);
            ctx.restore();
          }}
        />
      </div>
    </div>
  );
}
