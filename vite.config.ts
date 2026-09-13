import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          graphics: ["three"],
          physics: ["@dimforge/rapier3d-compat"],
        },
      },
    },
    // Rapier's compatibility package embeds its WebAssembly binary.
    chunkSizeWarningLimit: 2300,
  },
});
