import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["server.ts"],
  format: ["esm"],
  outDir: "dist",
  splitting: false,
  // Keep these as external since they're native Node modules or have CJS dependencies
  external: ["next", "socket.io", "ioredis"],
  // Bundle all @getblitz packages since they export TypeScript source
  noExternal: [/@getblitz\/.*/],
  // Ensure we're targeting Node.js
  platform: "node",
  target: "node22",
  // Clean the output folder before building
  clean: true,
  dts: false,
});
