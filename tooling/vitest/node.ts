/// <reference types="vitest" />

import { mergeConfig } from "vitest/config";

import { baseConfig } from "@getblitz/vitest-config/base";

export default mergeConfig(baseConfig, {
  test: {
    environment: "node",
  },
});
