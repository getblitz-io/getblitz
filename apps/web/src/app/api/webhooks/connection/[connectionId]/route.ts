import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { IBankWebhookService } from "@getblitz/api";
import { getContainer, webhookLogger } from "@getblitz/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  const { connectionId } = await params;

  try {
    const container = getContainer();
    const bankWebhookService =
      container.bankWebhookService as IBankWebhookService;

    const result = await bankWebhookService.processWebhookByConnectionId({
      connectionId,
      request,
    });

    // Map service result to HTTP responses
    if (result.success) {
      // Wise (and similar) probe callbacks during subscription create.
      if (result.errorCode === "IGNORE") {
        return NextResponse.json({ status: "ok" });
      }

      return NextResponse.json({
        received: true,
        processed: true,
        ...(result.alreadyProcessed && { alreadyProcessed: true }),
      });
    }

    // Handle error cases
    switch (result.errorCode) {
      case "NOT_FOUND":
        return NextResponse.json(
          { error: result.error ?? "Not found" },
          { status: 404 },
        );
      case "INVALID_SIGNATURE":
        return NextResponse.json(
          { error: result.error ?? "Invalid signature" },
          { status: 401 },
        );
      case "SETTLEMENT_FAILED":
        return NextResponse.json({
          received: true,
          processed: false,
          error: result.error,
        });
      default:
        webhookLogger.error(`Webhook processing error`, {
          connectionId,
          error: result.error,
          errorCode: result.errorCode,
        });
        return NextResponse.json(
          { error: result.error ?? "Internal server error" },
          { status: 500 },
        );
    }
  } catch (error) {
    webhookLogger.error(`Unexpected webhook error`, {
      connectionId,
      error: String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
