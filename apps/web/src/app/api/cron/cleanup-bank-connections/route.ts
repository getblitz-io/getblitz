import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { cronLogger, getContainer } from "@getblitz/api";

import { env } from "~/env";

/**
 * Cron endpoint to cleanup expired bank connections
 *
 * This should be called periodically (e.g., daily) by a cron job service.
 *
 * Example Vercel Cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-bank-connections",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = env.CRON_SECRET;

  // In development, allow without secret for testing
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    cronLogger.error("Unauthorized cron request for bank connection cleanup");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const container = getContainer();
    const { bankConnectionService } = container;

    const { expiredCount, cutoffDate } =
      await bankConnectionService.cleanupExpiredConnections();
    const now = new Date();

    cronLogger.info("Cleaned up expired bank connections", {
      count: expiredCount,
      cutoffDate: cutoffDate.toISOString(),
      timestamp: now.toISOString(),
    });

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      cutoffDate: cutoffDate.toISOString(),
      timestamp: now.toISOString(),
    });
  } catch (error) {
    cronLogger.error("Error cleaning up bank connections", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Also support POST for flexibility with different cron services
export { GET as POST };
