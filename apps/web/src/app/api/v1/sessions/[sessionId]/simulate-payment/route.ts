import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getContainer } from "@getblitz/api";

import { env } from "~/env";

// CORS headers for cross-origin requests from demo app
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    if (env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "This endpoint is only available in development mode" },
        { status: 403, headers: corsHeaders },
      );
    }

    const { sessionId } = await params;

    const container = getContainer();
    const { paymentSessionService } = container;

    const result = await paymentSessionService.simulatePayment({ sessionId });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        sessionId: result.sessionId,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Simulate payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
