import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "/xiangqi-arena/",
  publicDir: fileURLToPath(new URL("../public", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("..", import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL("../dist-pages", import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
});
