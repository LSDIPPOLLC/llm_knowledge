import { create } from "zustand";

export interface RecentVault {
  path: string;
  lastUsed: number;
}

const KEY = "ideallm.recentVaults";
const CAP = 8;

function read(): RecentVault[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v) => v && typeof v.path === "string")
      .map((v) => ({ path: v.path, lastUsed: Number(v.lastUsed) || 0 }))
      .slice(0, CAP);
  } catch {
    return [];
  }
}

function write(list: RecentVault[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

interface RecentState {
  list: RecentVault[];
  add: (path: string) => void;
  remove: (path: string) => void;
  clear: () => void;
}

export const useRecent = create<RecentState>((set, get) => ({
  list: read(),
  add: (path) => {
    const now = Date.now();
    const list = [{ path, lastUsed: now }, ...get().list.filter((v) => v.path !== path)].slice(0, CAP);
    write(list);
    set({ list });
  },
  remove: (path) => {
    const list = get().list.filter((v) => v.path !== path);
    write(list);
    set({ list });
  },
  clear: () => { write([]); set({ list: [] }); },
}));
