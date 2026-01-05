/// <reference types="vitest" />

import react from "@vitejs/plugin-react";
import { mergeConfig } from "vitest/config";

import { baseConfig } from "@getblitz/vitest-config/base";

export default mergeConfig(baseConfig, {
  plugins: [react()],
  test: {
    environment: "jsdom",
  },
});
