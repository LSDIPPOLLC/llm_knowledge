import { useEffect, useRef, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Check, X, ChevronDown } from "lucide-react";
import { useVault } from "../state/vault";
import { useRecent } from "../state/recent";

function shortenPath(p: string, max = 40): string {
  if (p.length <= max) return p;
  const parts = p.split("/").filter(Boolean);
  if (parts.length <= 2) return p;
  return `…/${parts.slice(-2).join("/")}`;
}

function relTime(ts: number): string {
  const d = Date.now() - ts;
  const s = Math.floor(d / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  return `${mo}mo ago`;
}

export function VaultMenu() {
  const root = useVault((s) => s.root);
  const loadRoot = useVault((s) => s.loadRoot);
  const recent = useRecent((s) => s.list);
  const remove = useRecent((s) => s.remove);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickNew = async () => {
    setOpen(false);
    const picked = await openDialog({ directory: true, multiple: false });
    if (typeof picked === "string") await loadRoot(picked);
  };

  const switchTo = async (path: string) => {
    setOpen(false);
    if (path === root) return;
    await loadRoot(path);
  };

  const rootShort = root ? shortenPath(root) : "pick vault";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="vault-label"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="vault picker"
      >
        <FolderOpen size={12} aria-hidden="true" />
        <span className="vault-label-path">{rootShort}</span>
        <ChevronDown size={11} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menuRef}
          className="vault-menu"
          role="menu"
          aria-label="recent vaults"
        >
          <div className="vault-menu-heading">
            <span>recent vaults</span>
            <span className="count">{recent.length}</span>
          </div>
          {recent.length === 0 && (
            <div className="vault-menu-empty">no vault history yet.</div>
          )}
          {recent.map((v) => {
            const isCurrent = v.path === root;
            return (
              <div
                key={v.path}
                className={"vault-menu-item" + (isCurrent ? " current" : "")}
                role="menuitem"
              >
                <button
                  type="button"
                  className="vault-menu-pick"
                  onClick={() => switchTo(v.path)}
                  title={v.path}
                >
                  {isCurrent ? <Check size={11} aria-hidden="true" /> : <span className="dot-slot" />}
                  <span className="vm-path">{shortenPath(v.path, 42)}</span>
                  <span className="vm-time">{relTime(v.lastUsed)}</span>
                </button>
                <button
                  type="button"
                  className="vault-menu-remove"
                  onClick={(e) => { e.stopPropagation(); remove(v.path); }}
                  aria-label={`forget ${v.path}`}
                  title="forget"
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </div>
            );
          })}
          <div className="vault-menu-divider" />
          <button
            type="button"
            className="vault-menu-action"
            onClick={pickNew}
            role="menuitem"
          >
            <FolderOpen size={11} aria-hidden="true" />
            <span>pick a new vault…</span>
          </button>
        </div>
      )}
    </>
  );
}
