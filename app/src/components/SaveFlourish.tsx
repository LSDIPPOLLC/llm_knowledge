import { useEffect, useState } from "react";
import { useTabs } from "../state/tabs";

const MARKS = ["— set in ink", "— pressed", "— fair copy", "— to the archive"];

export function SaveFlourish() {
  const tabs = useTabs((s) => s.tabs);
  const [flash, setFlash] = useState<{ key: number; text: string } | null>(null);
  const [snapshot, setSnapshot] = useState<Record<string, number>>({});

  useEffect(() => {
    const next: Record<string, number> = {};
    let fired = false;
    for (const t of tabs) {
      next[t.path] = t.mtime;
      const prev = snapshot[t.path];
      if (prev !== undefined && t.mtime !== prev && !t.dirty) {
        fired = true;
      }
    }
    setSnapshot(next);
    if (fired) {
      setFlash({ key: Date.now(), text: MARKS[Math.floor(Math.random() * MARKS.length)] });
    }
  }, [tabs]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1200);
    return () => clearTimeout(t);
  }, [flash]);

  if (!flash) return null;
  return (
    <div key={flash.key} className="save-flourish" aria-live="polite">
      {flash.text}
    </div>
  );
}
