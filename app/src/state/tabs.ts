import { create } from "zustand";
import { api } from "../lib/api";

export type ViewMode = "edit" | "preview" | "split";

export interface Tab {
  path: string;
  title: string;
  content: string;
  dirty: boolean;
  mtime: number;
  mode: ViewMode;
}

interface TabState {
  tabs: Tab[];
  active: string | null;
  openPath: (path: string) => Promise<void>;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  setContent: (path: string, content: string) => void;
  save: (path: string) => Promise<void>;
  setMode: (path: string, mode: ViewMode) => void;
  openGraphTab: () => void;
}

export const useTabs = create<TabState>((set, get) => ({
  tabs: [],
  active: null,
  openPath: async (path) => {
    if (path === "__graph__") { get().openGraphTab(); return; }
    const existing = get().tabs.find((t) => t.path === path);
    if (existing) { set({ active: path }); return; }
    let data;
    try {
      data = await api.fileRead(path);
    } catch (e) {
      console.error("failed to read file", path, e);
      return;
    }
    const title = path.split("/").pop()!.replace(/\.md$/, "");
    set({
      tabs: [
        ...get().tabs,
        { path, title, content: data.content, dirty: false, mtime: data.mtime, mode: "split" },
      ],
      active: path,
    });
  },
  openGraphTab: () => {
    const path = "__graph__";
    if (!get().tabs.find((t) => t.path === path)) {
      set({
        tabs: [...get().tabs, { path, title: "Graph", content: "", dirty: false, mtime: 0, mode: "preview" }],
      });
    }
    set({ active: path });
  },
  closeTab: (path) => {
    const tabs = get().tabs.filter((t) => t.path !== path);
    const active = get().active === path ? (tabs[tabs.length - 1]?.path ?? null) : get().active;
    set({ tabs, active });
  },
  setActive: (path) => set({ active: path }),
  setContent: (path, content) =>
    set({
      tabs: get().tabs.map((t) =>
        t.path === path ? { ...t, content, dirty: true } : t
      ),
    }),
  save: async (path) => {
    const tab = get().tabs.find((t) => t.path === path);
    if (!tab || !tab.dirty || (tab as any)._saving) return;
    set({
      tabs: get().tabs.map((t) => (t.path === path ? { ...t, _saving: true } as any : t)),
    });
    try {
      const mtime = await api.fileWrite(path, tab.content);
      set({
        tabs: get().tabs.map((t) =>
          t.path === path ? ({ ...t, dirty: false, mtime, _saving: false } as any) : t
        ),
      });
    } catch (e) {
      set({
        tabs: get().tabs.map((t) => (t.path === path ? ({ ...t, _saving: false } as any) : t)),
      });
      throw e;
    }
  },
  setMode: (path, mode) =>
    set({
      tabs: get().tabs.map((t) => (t.path === path ? { ...t, mode } : t)),
    }),
}));
