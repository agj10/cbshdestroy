import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Full-campus WebAssembly simulations are CPU-heavy; keep CI contention bounded.
    maxWorkers: 2,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
