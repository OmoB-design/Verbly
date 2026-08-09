import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Match tsconfig's "@/*" → project root, so tests can import app modules
      // the same way application code does.
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
