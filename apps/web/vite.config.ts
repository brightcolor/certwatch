import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": apiTarget,
      "/metrics": apiTarget,
      "/public": apiTarget
    }
  }
});
