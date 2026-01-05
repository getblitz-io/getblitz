import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@getblitz/eslint-config/base";

export default defineConfig(
  {
    ignores: ["script/**"],
  },
  baseConfig,
  restrictEnvAccess,
);
