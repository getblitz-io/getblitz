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
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const authorizationHeader = request.headers.get("Authorization");

    if (!authorizationHeader) {
      return NextResponse.json(
        { error: "Authorization header is required" },
        { status: 401, headers: corsHeaders },
      );
    }
    const clientToken = authorizationHeader.replace("Bearer ", "");
    if (!clientToken) {
      return NextResponse.json(
        { error: "Client token is required" },
        { status: 401, headers: corsHeaders },
      );
    }

    const origin = request.headers.get("Origin");
    if (!origin) {
      return NextResponse.json(
        { error: "Origin header is required" },
        { status: 401, headers: corsHeaders },
      );
    }

    // Verify session access
    const { sessionId } = await params;
    const container = getContainer();
    const { paymentSessionService } = container;

    try {
      await paymentSessionService.verifySessionAccess({
        sessionId,
        clientToken,
        origin,
      });
    } catch (error) {
      console.warn(
        "Session access verification failed:",
        error instanceof Error ? error.message : error,
      );
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401, headers: corsHeaders },
      );
    }

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
