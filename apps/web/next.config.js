import { createJiti } from "jiti";
import createNextIntlPlugin from "next-intl/plugin";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

const withNextIntl = createNextIntlPlugin();

/** @type {import("next").NextConfig} */
const config = {
  experimental: {
    optimizePackageImports: ["@getblitz/ui", "@radix-ui/react-icons"],
  },
  distDir: process.env.APPLICATION_ENV === "test" ? ".next-test" : ".next",
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
    "@getblitz/validators",
    "@getblitz/websocket",
    "@getblitz/queue",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },

  async headers() {
    return [
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
      {
        source: "/api/swagger",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS",
          },
        ],
      },
    ];
  },
  allowedDevOrigins: ["local.getblitz.io"],
};

export default withNextIntl(config);
