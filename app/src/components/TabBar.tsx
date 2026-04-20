import { X } from "lucide-react";
import { KeyboardEvent } from "react";
import { useTabs } from "../state/tabs";

function activateOnKey(e: KeyboardEvent, cb: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    cb();
  }
}

export function TabBar() {
  const { tabs, active, setActive, closeTab } = useTabs();
  if (!tabs.length) return <div className="tabbar" role="tablist" aria-label="open pages" />;
  return (
    <div className="tabbar" role="tablist" aria-label="open pages">
      {tabs.map((t) => {
        const isActive = active === t.path;
        return (
          <div
            key={t.path}
            role="tab"
            aria-selected={isActive}
            aria-label={t.dirty ? `${t.title} (unsaved)` : t.title}
            tabIndex={0}
            className={"tab" + (isActive ? " active" : "")}
            onClick={() => setActive(t.path)}
            onKeyDown={(e) => activateOnKey(e, () => setActive(t.path))}
            title={t.path}
          >
            {t.dirty && <span className="dot" aria-hidden="true" />}
            <span className="tab-title">{t.title}</span>
            <button
              type="button"
              className="tab-close"
              aria-label={`close ${t.title}`}
              onClick={(e) => { e.stopPropagation(); closeTab(t.path); }}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
