import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "GetBlitz",
      fileName: "getblitz",
    },
    rollupOptions: {
      external: [],
      output: { globals: {} },
    },
  },
});
