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
);
