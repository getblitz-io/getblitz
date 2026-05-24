import { closeDatabaseConnection } from "./helpers/db.helper";

async function globalTeardown() {
  console.log("🧹 Running E2E test suite global teardown...");
  try {
    await closeDatabaseConnection();
    console.log("✅ Global teardown complete.");
  } catch (error) {
    console.error("❌ E2E Global Teardown error:", error);
  }
}

export default globalTeardown;
