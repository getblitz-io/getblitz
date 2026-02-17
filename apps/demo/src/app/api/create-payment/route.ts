import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "~/env";

interface ChallengeResponse {
  sessionId: string;
  referenceId: string;
  paymentUrl: string;
  expiresAt: string;
  clientToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      amount?: number;
      productId?: string;
    };
    const { amount, productId } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Call GetBlitz Gateway to create payment challenge
    const response = await fetch(`${env.GETBLITZ_API_URL}/api/v1/challenge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GETBLITZ_API_KEY}`,
      },
      body: JSON.stringify({
        amount,
        currency: "EUR",
        metadata: {
          productId,
          source: "demo-store",
        },
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: string };
      console.error("GetBlitz API Error:", error);
      return NextResponse.json(
        { error: error.error ?? "Failed to create payment" },
        { status: 500 },
      );
    }

    const data = (await response.json()) as ChallengeResponse;

    return NextResponse.json({
      sessionId: data.sessionId,
      referenceId: data.referenceId,
      paymentUrl: data.paymentUrl,
      expiresAt: data.expiresAt,
      clientToken: data.clientToken,
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
