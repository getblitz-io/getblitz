import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getContainer } from "@getblitz/api";

// CORS headers for cross-origin requests from SDK
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const container = getContainer();
    const { paymentSessionService } = container;

    const sessionDetails = await paymentSessionService.getSessionDetails({
      sessionId,
    });

    if (!sessionDetails) {
      return NextResponse.json(
        { error: "Payment session not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    return NextResponse.json(sessionDetails, { headers: corsHeaders });
  } catch (error) {
    console.error("Session Details API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
