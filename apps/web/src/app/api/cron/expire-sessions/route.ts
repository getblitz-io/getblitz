import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { cronLogger, getContainer } from "@getblitz/api";

import { env } from "~/env";

/**
 * Cron endpoint to expire pending payment sessions
 *
 * This should be called periodically (e.g., every minute) by a cron job service
 * like Vercel Cron, Upstash QStash, or a simple cron on your server.
 *
 * Example Vercel Cron config in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-sessions",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = env.CRON_SECRET;

  // In development, allow without secret for testing
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    cronLogger.error("Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const container = getContainer();
    const { paymentSessionService } = container;

    const expiredCount = await paymentSessionService.expireSessions();
    const now = new Date();

    cronLogger.info("Expired payment sessions", {
      count: expiredCount,
      timestamp: now.toISOString(),
    });

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    cronLogger.error("Error expiring sessions", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Also support POST for flexibility with different cron services
export { GET as POST };
