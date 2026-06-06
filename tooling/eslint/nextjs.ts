import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig } from "eslint/config";

export const nextjsConfig = defineConfig({
  files: ["**/*.ts", "**/*.tsx"],
  plugins: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    "@next/next": nextPlugin as any,
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs["core-web-vitals"].rules,
    // TypeError: context.getAncestors is not a function
    "@next/next/no-duplicate-head": "off",
  },
});
