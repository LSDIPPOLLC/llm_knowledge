import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "../state/theme";

let mermaidLoader: Promise<typeof import("mermaid")["default"]> | null = null;
function loadMermaid() {
  if (!mermaidLoader) {
    mermaidLoader = import("mermaid").then((m) => m.default);
  }
  return mermaidLoader;
}

export function Mermaid({ code }: { code: string }) {
  const uid = useId().replace(/[:]/g, "_");
  const resolved = useTheme((s) => s.resolved);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: resolved === "dark" ? "dark" : "neutral",
          fontFamily: 'Fraunces, "Source Serif 4", Georgia, serif',
          themeVariables: {
            primaryColor: getVar("--paper-1"),
            primaryTextColor: getVar("--ink"),
            primaryBorderColor: getVar("--rule"),
            lineColor: getVar("--ink-dim"),
            secondaryColor: getVar("--paper-2"),
            tertiaryColor: getVar("--paper"),
            mainBkg: getVar("--paper-1"),
            background: getVar("--paper"),
            nodeBorder: getVar("--umber"),
            clusterBkg: getVar("--paper-2"),
            clusterBorder: getVar("--rule"),
            edgeLabelBackground: getVar("--paper"),
            titleColor: getVar("--ink"),
            textColor: getVar("--ink-soft"),
          },
        });
        const id = `mmd-${uid}`;
        const { svg } = await mermaid.render(id, code);
        if (cancelled || !hostRef.current) return;
        hostRef.current.innerHTML = svg;
        setError(null);
      } catch (e: any) {
        if (cancelled) return;
        setError(String(e?.message || e));
      }
    })();
    return () => { cancelled = true; };
  }, [code, resolved, uid]);

  if (error) {
    return (
      <div className="mermaid-error" role="alert">
        <strong>diagram failed.</strong> {error}
        <pre className="mermaid-source">{code}</pre>
      </div>
    );
  }
  return <div ref={hostRef} className="mermaid-block" aria-label="diagram" />;
}

function getVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
