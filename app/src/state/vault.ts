import { create } from "zustand";
import { api, TreeNode, Graph } from "../lib/api";
import { useRecent } from "./recent";

interface VaultState {
  root: string | null;
  tree: TreeNode[];
  graph: Graph | null;
  index: Map<string, string>; // stem/title (lowercase) -> path
  loadRoot: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  refreshGraph: () => Promise<void>;
  resolveWikilink: (target: string) => string | null;
}

export const useVault = create<VaultState>((set, get) => ({
  root: null,
  tree: [],
  graph: null,
  index: new Map(),
  loadRoot: async (path) => {
    await api.setVaultRoot(path);
    set({ root: path });
    useRecent.getState().add(path);
    await get().refresh();
  },
  refresh: async () => {
    const tree = await api.vaultList();
    set({ tree });
    await get().refreshGraph();
  },
  refreshGraph: async () => {
    try {
      const graph = await api.graphBuild();
      const idx = new Map<string, string>();
      for (const n of graph.nodes) {
        const stem = n.path.split("/").pop()!.replace(/\.md$/, "");
        idx.set(stem.toLowerCase(), n.path);
        idx.set(n.title.toLowerCase(), n.path);
      }
      set({ graph, index: idx });
    } catch (e) {
      console.error("graph build failed", e);
    }
  },
  resolveWikilink: (target) => {
    return get().index.get(target.toLowerCase()) || null;
  },
}));
