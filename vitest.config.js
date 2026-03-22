import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("test"),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.js"],
    globals: true,
  },
});
