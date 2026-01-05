import { createJiti } from "jiti";
import createNextIntlPlugin from "next-intl/plugin";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

const withNextIntl = createNextIntlPlugin();

/** @type {import("next").NextConfig} */
const config = {
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@getblitz/api",
    "@getblitz/auth",
    "@getblitz/bank-providers",
    "@getblitz/database",
    "@getblitz/redis",
    "@getblitz/shared-types",
    "@getblitz/ui",
    "@getblitz/validators",
    "@getblitz/websocket",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default withNextIntl(config);
