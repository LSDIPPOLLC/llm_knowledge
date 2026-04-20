import { invoke } from "@tauri-apps/api/core";

export interface TreeNode {
  name: string;
  path: string;
  is_dir: boolean;
  children: TreeNode[];
}
export interface FileData { content: string; mtime: number; }
export interface GraphNode {
  id: string; path: string; title: string; node_type: string; status: string;
}
export interface GraphLink { source: string; target: string; }
export interface Graph { nodes: GraphNode[]; links: GraphLink[]; }

export const api = {
  setVaultRoot: (path: string) => invoke<void>("set_vault_root", { path }),
  getVaultRoot: () => invoke<string | null>("get_vault_root"),
  vaultList: () => invoke<TreeNode[]>("vault_list"),
  fileRead: (path: string) => invoke<FileData>("file_read", { path }),
  fileWrite: (path: string, content: string) =>
    invoke<number>("file_write", { path, content }),
  fileCreate: (path: string, content: string) =>
    invoke<void>("file_create", { path, content }),
  dirCreate: (path: string) => invoke<void>("dir_create", { path }),
  graphBuild: () => invoke<Graph>("graph_build"),
  backlinks: (targetPath: string) =>
    invoke<GraphNode[]>("backlinks", { targetPath }),
  opsRun: (kind: string, arg: string) =>
    invoke<number>("ops_run", { kind, arg }),
  opsCancel: (id: number) => invoke<void>("ops_cancel", { id }),
  searchWiki: (term: string, scope?: string) =>
    invoke<string>("search_wiki", { term, scope }),
};
