import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-force-graph") || id.includes("force-graph") || id.match(/[\\/]d3[-/]/)) return "graph";
          if (id.includes("@codemirror") || id.includes("@uiw/react-codemirror") || id.includes("@lezer")) return "editor";
          if (id.includes("unified") || id.includes("remark-") || id.includes("rehype-") ||
              id.includes("micromark") || id.includes("mdast") || id.includes("hast") ||
              id.includes("unist") || id.includes("vfile")) return "markdown";
          if (id.includes("cmdk")) return "cmdk";
          if (id.includes("js-yaml")) return "yaml";
          if (id.includes("lucide-react")) return "icons";
          // react + everything else → default vendor chunk
        },
      },
    },
  },
});
