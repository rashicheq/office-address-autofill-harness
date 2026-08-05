import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxies the harness's API routes to the Express backend (CLAUDE.md 4.0 /
// README) so the frontend can call relative paths in both dev and preview.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/search": "http://localhost:8787",
      "/scenarios": "http://localhost:8787",
      "/suggest": "http://localhost:8787",
      "/meta": "http://localhost:8787",
      "/health": "http://localhost:8787",
    },
  },
});
