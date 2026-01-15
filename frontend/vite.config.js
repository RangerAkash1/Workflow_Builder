import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config keeps things simple for now.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
