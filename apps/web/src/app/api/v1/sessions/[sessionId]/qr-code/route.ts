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

    const result = await paymentSessionService.getQrCodeBase64({
      sessionId,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Payment session not found or QR code generation failed" },
        { status: 404, headers: corsHeaders },
      );
    }

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error("QR Code API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}
