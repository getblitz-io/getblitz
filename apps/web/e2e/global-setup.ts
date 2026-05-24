import { execSync } from "child_process";

import { resetDatabase } from "./helpers/db.helper";

async function globalSetup() {
  console.log("🚀 Starting E2E test suite global setup...");

  try {
    console.log("📦 Syncing schema to test database...");
    execSync(
      `pnpm --filter @getblitz/database prisma:push --accept-data-loss`,
      {
        stdio: "inherit",
      },
    );

    console.log("🧹 Cleaning up old test data...");
    await resetDatabase();
    console.log("✅ Global setup completed.");
  } catch (error) {
    console.error("❌ E2E Global Setup failed:", error);
    throw error;
  }
}

export default globalSetup;
