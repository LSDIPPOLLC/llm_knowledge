import { create } from "zustand";
import { api } from "../lib/api";
import { listen } from "@tauri-apps/api/event";

export interface OpLine { stream: "stdout" | "stderr"; data: string; }
export interface OpRun {
  id: number;
  kind: string;
  arg: string;
  lines: OpLine[];
  exitCode: number | null;
  startedAt: number;
}

interface OpsState {
  runs: OpRun[];
  activeId: number | null;
  init: () => Promise<void>;
  run: (kind: string, arg: string) => Promise<number>;
  cancel: (id: number) => Promise<void>;
  setActive: (id: number | null) => void;
  clear: () => void;
}

let initialized = false;

export const useOps = create<OpsState>((set, get) => ({
  runs: [],
  activeId: null,
  init: async () => {
    if (initialized) return;
    initialized = true;
    await listen<{ id: number; stream: string; data: string }>("ops:chunk", (e) => {
      set({
        runs: get().runs.map((r) =>
          r.id === e.payload.id
            ? { ...r, lines: [...r.lines, { stream: e.payload.stream as any, data: e.payload.data }] }
            : r
        ),
      });
    });
    await listen<{ id: number; code: number }>("ops:exit", (e) => {
      set({
        runs: get().runs.map((r) =>
          r.id === e.payload.id ? { ...r, exitCode: e.payload.code } : r
        ),
      });
    });
  },
  run: async (kind, arg) => {
    const id = await api.opsRun(kind, arg);
    set({
      runs: [
        ...get().runs,
        { id, kind, arg, lines: [], exitCode: null, startedAt: Date.now() },
      ],
      activeId: id,
    });
    return id;
  },
  cancel: async (id) => { await api.opsCancel(id); },
  setActive: (id) => set({ activeId: id }),
  clear: () => set({ runs: [], activeId: null }),
}));
