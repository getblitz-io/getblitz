import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@getblitz/ui"],
  },
  transpilePackages: ["@getblitz/ui"],
};

export default withNextIntl(nextConfig);
