import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@getblitz/eslint-config/base";
import { nextjsConfig } from "@getblitz/eslint-config/nextjs";
import { reactConfig } from "@getblitz/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
  {
    files: ["e2e/**/*.ts"],
    rules: {
      // Playwright fixture callbacks use `await use(...)` — not React hooks.
      "react-hooks/rules-of-hooks": "off",
      "no-empty-pattern": "off",
    },
  },
);
