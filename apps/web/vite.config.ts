import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = "http://localhost:8080";

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  // The server bundle renders markup; it has no use for the static files, and
  // copying them again would only duplicate them next to the browser build.
  publicDir: isSsrBuild ? false : "public",
  server: {
    proxy: {
      "/api": apiTarget,
      "/metrics": apiTarget,
      "/public": apiTarget
    }
  }
}));
