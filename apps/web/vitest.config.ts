import { defineConfig, mergeConfig } from "vitest/config";

import reactConfig from "@getblitz/vitest-config/react";

export default mergeConfig(
  reactConfig,
  defineConfig({
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        ".next/**",
        ".next-test/**",
        "e2e/**",
        "playwright-report/**",
        "test-results/**",
      ],
    },
  }),
);
