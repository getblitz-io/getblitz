import { defineConfig } from "eslint/config";

import { baseConfig } from "@getblitz/eslint-config/base";
import { reactConfig } from "@getblitz/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
