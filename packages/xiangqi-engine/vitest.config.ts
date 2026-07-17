import { defineConfig } from "vitest/config";

export default defineConfig({
  root: decodeURIComponent(new URL(".", import.meta.url).pathname),
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
