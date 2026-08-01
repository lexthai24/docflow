import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // server-only เป็น marker package สำหรับ Next — stub เป็น empty module ตอนเทส
      "server-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
    },
  },
});
