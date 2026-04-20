import { create } from "zustand";

export type ThemeMode = "auto" | "light" | "dark";
const KEY = "ideallm.theme";

function prefersDark(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolve(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") return prefersDark() ? "dark" : "light";
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const resolved = resolve(mode);
  root.classList.toggle("theme-dark", resolved === "dark");
  root.classList.toggle("theme-light", resolved === "light");
  root.dataset.theme = mode;
  root.style.colorScheme = resolved;
}

export function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "auto") return v;
  } catch {}
  return "auto";
}

interface ThemeState {
  mode: ThemeMode;
  resolved: "light" | "dark";
  cycle: () => void;
  set: (m: ThemeMode) => void;
  syncSystem: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: readStoredTheme(),
  resolved: resolve(readStoredTheme()),
  cycle: () => {
    const order: ThemeMode[] = ["auto", "light", "dark"];
    const idx = order.indexOf(get().mode);
    const next = order[(idx + 1) % order.length];
    get().set(next);
  },
  set: (m) => {
    try { localStorage.setItem(KEY, m); } catch {}
    applyTheme(m);
    set({ mode: m, resolved: resolve(m) });
  },
  syncSystem: () => {
    if (get().mode !== "auto") return;
    applyTheme("auto");
    set({ resolved: resolve("auto") });
  },
}));

export function initThemeListener() {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const h = () => useTheme.getState().syncSystem();
  mql.addEventListener("change", h);
  return () => mql.removeEventListener("change", h);
}
