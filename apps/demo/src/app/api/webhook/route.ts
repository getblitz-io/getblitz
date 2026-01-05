import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface WebhookPayload {
  event: string;
  sessionId: string;
  referenceId: string;
  amountCents: number;
  currency: string;
  clientToken?: string;
  metadata?: Record<string, unknown>;
}

// This simulates what a real merchant would receive
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WebhookPayload;

    console.log("═══════════════════════════════════════════");
    console.log("📥 DEMO WEBHOOK RECEIVED");
    console.log("═══════════════════════════════════════════");
    console.log("Event:", body.event);
    console.log("Session:", body.sessionId);
    console.log("Reference:", body.referenceId);
    console.log("Amount:", body.amountCents, "cents");
    console.log(
      "Token:",
      body.clientToken ? body.clientToken.slice(0, 16) + "..." : "N/A",
    );
    console.log("═══════════════════════════════════════════");

    // In a real app, you would:
    // 1. Verify the webhook signature
    // 2. Update your database (mark order as paid)
    // 3. Fulfill the order (send product, unlock access, etc.)
    // 4. Send confirmation email

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
