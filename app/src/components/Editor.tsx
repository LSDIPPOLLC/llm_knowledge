import { useEffect, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { wikilinkPlugin } from "../lib/wikilink";
import { useTabs } from "../state/tabs";
import { useVault } from "../state/vault";

const editorialTheme = EditorView.theme({
  "&": { backgroundColor: "transparent", color: "var(--ink)" },
  ".cm-content": { caretColor: "var(--oxblood)", fontFamily: "var(--serif-body)" },
  ".cm-line": {
    fontFamily: "var(--serif-body)",
    fontSize: "16px",
    lineHeight: "1.75",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "color-mix(in oklab, var(--oxblood) 20%, transparent) !important",
  },
  ".ͼc": { color: "var(--oxblood)", fontStyle: "italic" },       // headings
  ".ͼd": { color: "var(--umber)" },                                // emphasis
  ".ͼe": { color: "var(--ink)", fontWeight: "600" },               // strong
  ".ͼf": { color: "var(--sage)", fontFamily: "var(--mono)" },      // inline code
  ".ͼg": { color: "var(--ink-dim)" },                              // link / meta
  ".cm-formatting": { color: "var(--ink-dim)", opacity: 0.5 },
  ".cm-header": {
    fontFamily: "var(--serif-display)",
    color: "var(--ink)",
    fontWeight: "500",
  },
  ".cm-quote": { color: "var(--ink-soft)", fontStyle: "italic" },
  ".cm-link": { color: "var(--oxblood)" },
  ".cm-url": { color: "var(--ink-dim)", fontFamily: "var(--mono)", fontSize: "0.85em" },
  ".cm-inline-code": { fontFamily: "var(--mono)", fontSize: "0.88em", color: "var(--ink)" },
}, { dark: false });

export function Editor({ path }: { path: string }) {
  const tab = useTabs((s) => s.tabs.find((t) => t.path === path)!);
  const setContent = useTabs((s) => s.setContent);
  const save = useTabs((s) => s.save);
  const openPath = useTabs((s) => s.openPath);
  const resolve = useVault((s) => s.resolveWikilink);

  const extensions = useMemo(
    () => [
      markdown(),
      EditorView.lineWrapping,
      editorialTheme,
      wikilinkPlugin((target) => {
        const resolved = resolve(target);
        if (resolved) openPath(resolved);
      }),
    ],
    [resolve, openPath]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save(path);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path, save]);

  return (
    <div className="editor-pane">
      <CodeMirror
        value={tab.content}
        extensions={extensions}
        onChange={(v) => setContent(path, v)}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          bracketMatching: false,
        }}
        height="100%"
      />
    </div>
  );
}
