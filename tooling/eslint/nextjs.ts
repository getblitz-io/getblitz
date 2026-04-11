import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig } from "eslint/config";

export const nextjsConfig = defineConfig({
  files: ["**/*.ts", "**/*.tsx"],
  plugins: {
    // @ts-expect-error - The types of `eslint-plugin-next` and `eslint` are slightly mismatched
    "@next/next": nextPlugin,
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs["core-web-vitals"].rules,
    // TypeError: context.getAncestors is not a function
    "@next/next/no-duplicate-head": "off",
  },
});
