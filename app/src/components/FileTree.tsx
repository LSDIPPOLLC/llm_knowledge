import { memo, useState, useRef, useEffect, KeyboardEvent } from "react";
import { ChevronRight, ChevronDown, FilePlus, FolderPlus, X } from "lucide-react";
import { TreeNode, api } from "../lib/api";
import { useTabs } from "../state/tabs";
import { useVault } from "../state/vault";

type NewKind = "file" | "dir" | null;

function nodeType(path: string): string {
  if (path.includes("concepts/")) return "c";
  if (path.includes("entities/")) return "e";
  if (path.includes("sources/")) return "s";
  if (path.includes("comparisons/")) return "k";
  if (path.includes("reflections/")) return "r";
  if (path.includes("decisions/")) return "d";
  if (path.includes("runbooks/")) return "rb";
  if (path.includes("incidents/")) return "i";
  if (path.startsWith("raw/articles")) return "a";
  if (path.startsWith("raw/papers")) return "p";
  if (path.startsWith("raw/notes")) return "n";
  return "·";
}

function activateOnKey(e: KeyboardEvent, cb: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    cb();
  }
}

function sanitizeName(s: string): string {
  return s.trim().replace(/[\\/]+/g, "-");
}

function todayFrontmatter(title: string): string {
  const d = new Date().toISOString().slice(0, 10);
  return `---\ntitle: ${title}\ntype: concept\ncreated: ${d}\nupdated: ${d}\nstatus: current\n---\n\n# ${title}\n\n`;
}

interface NewRowProps {
  kind: Exclude<NewKind, null>;
  parent: string;
  depth: number;
  onDone: () => void;
}

function NewRow({ kind, parent, depth, onDone }: NewRowProps) {
  const INDENT = 18;
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const refresh = useVault((s) => s.refresh);
  const openPath = useTabs((s) => s.openPath);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const create = async () => {
    const clean = sanitizeName(name);
    if (!clean) { setError("name required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      if (kind === "file") {
        const withExt = clean.endsWith(".md") ? clean : `${clean}.md`;
        const stem = withExt.replace(/\.md$/, "");
        const path = parent ? `${parent}/${withExt}` : withExt;
        await api.fileCreate(path, todayFrontmatter(stem));
        await refresh();
        await openPath(path);
      } else {
        const path = parent ? `${parent}/${clean}` : clean;
        await api.dirCreate(path);
        await refresh();
      }
      onDone();
    } catch (e: any) {
      setError(String(e?.message || e));
      setSubmitting(false);
    }
  };

  return (
    <div
      className={"tree-new tree-new-" + kind}
      style={{ paddingLeft: depth * INDENT }}
    >
      <div className="tree-new-row">
        {kind === "file" ? <FilePlus size={11} aria-hidden="true" /> : <FolderPlus size={11} aria-hidden="true" />}
        <input
          ref={inputRef}
          value={name}
          placeholder={kind === "file" ? "new-page-name" : "new-folder"}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); create(); }
            if (e.key === "Escape") { e.preventDefault(); onDone(); }
          }}
          disabled={submitting}
          spellCheck={false}
          autoComplete="off"
          maxLength={200}
          aria-label={kind === "file" ? "new file name" : "new folder name"}
        />
        {kind === "file" && <span className="tree-new-ext">.md</span>}
        <button
          type="button"
          className="tree-new-cancel"
          onClick={onDone}
          aria-label="cancel"
        >
          <X size={11} aria-hidden="true" />
        </button>
      </div>
      {error && <div className="tree-new-error">{error}</div>}
    </div>
  );
}

interface NodeProps {
  node: TreeNode;
  depth: number;
  newAt: string | null;
  newKind: NewKind;
  onOpenNew: (parent: string, kind: Exclude<NewKind, null>) => void;
  onCloseNew: () => void;
}

const INDENT = 18;

const Node = memo(function Node({ node, depth, newAt, newKind, onOpenNew, onCloseNew }: NodeProps) {
  const [open, setOpen] = useState(depth < 1);
  const openPath = useTabs((s) => s.openPath);
  const active = useTabs((s) => s.active);
  const pad = { paddingLeft: depth * INDENT };

  if (!node.is_dir) {
    const name = node.name.replace(/\.md$/, "");
    const isActive = active === node.path;
    return (
      <div
        role="treeitem"
        aria-current={isActive ? "page" : undefined}
        aria-label={`open ${name}`}
        tabIndex={0}
        className={"tree-file" + (isActive ? " active" : "")}
        style={pad}
        onClick={() => openPath(node.path)}
        onKeyDown={(e) => activateOnKey(e, () => openPath(node.path))}
        title={node.path}
      >
        <span className="tree-rail" aria-hidden="true" />
        <span className="name">{name}</span>
        <span className="leader" aria-hidden="true" />
        <span className="leaf-tag" aria-hidden="true">{nodeType(node.path)}</span>
      </div>
    );
  }

  const isNewHere = newAt === node.path;

  return (
    <div role="group">
      <div
        role="treeitem"
        aria-expanded={open}
        aria-label={node.name}
        tabIndex={0}
        className="tree-dir"
        style={pad}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => activateOnKey(e, () => setOpen((o) => !o))}
      >
        {open ? <ChevronDown size={11} aria-hidden="true" /> : <ChevronRight size={11} aria-hidden="true" />}
        <span className="tree-dir-name">{node.name}</span>
        <span className="tree-dir-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="tree-action"
            aria-label={`new file in ${node.name}`}
            title="new page"
            onClick={() => { setOpen(true); onOpenNew(node.path, "file"); }}
          >
            <FilePlus size={11} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="tree-action"
            aria-label={`new folder in ${node.name}`}
            title="new folder"
            onClick={() => { setOpen(true); onOpenNew(node.path, "dir"); }}
          >
            <FolderPlus size={11} aria-hidden="true" />
          </button>
        </span>
      </div>
      {open && isNewHere && newKind && (
        <NewRow kind={newKind} parent={node.path} depth={depth + 1} onDone={onCloseNew} />
      )}
      {open && node.children.map((c) => (
        <Node
          key={c.path}
          node={c}
          depth={depth + 1}
          newAt={newAt}
          newKind={newKind}
          onOpenNew={onOpenNew}
          onCloseNew={onCloseNew}
        />
      ))}
    </div>
  );
});

export function FileTree({ tree }: { tree: TreeNode[] }) {
  const [newAt, setNewAt] = useState<string | null>(null);
  const [newKind, setNewKind] = useState<NewKind>(null);

  const openNew = (parent: string, kind: Exclude<NewKind, null>) => {
    setNewAt(parent);
    setNewKind(kind);
  };
  const closeNew = () => { setNewAt(null); setNewKind(null); };

  if (!tree.length) {
    return (
      <div className="filetree filetree-empty">
        no vault selected. pick one from the masthead.
      </div>
    );
  }
  return (
    <div className="filetree" role="tree" aria-label="vault contents">
      {tree.map((n) => (
        <Node
          key={n.path}
          node={n}
          depth={0}
          newAt={newAt}
          newKind={newKind}
          onOpenNew={openNew}
          onCloseNew={closeNew}
        />
      ))}
    </div>
  );
}
