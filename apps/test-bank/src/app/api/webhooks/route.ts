import { NextResponse } from "next/server";

interface WebhookRequest {
  callback_url: string;
  types?: string[];
}

// In-memory storage for webhook subscriptions (resets on server restart)
const webhookSubscriptions: Map<
  string,
  { callbackUrl: string; types: string[]; secret: string }
> = new Map<string, { callbackUrl: string; types: string[]; secret: string }>();

export async function POST(request: Request) {
  // Basic auth check
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error: "unauthorized",
        message: "Missing or invalid authorization header",
      },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as WebhookRequest;

    if (!body.callback_url) {
      return NextResponse.json(
        { error: "invalid_request", message: "Missing callback_url" },
        { status: 400 },
      );
    }

    // Generate dummy webhook ID and secret
    const webhookId = `wh_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const secret = `test_secret_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

    // Store the subscription
    webhookSubscriptions.set(webhookId, {
      callbackUrl: body.callback_url,
      types: body.types ?? ["v1/transactions"],
      secret,
    });

    return NextResponse.json({
      id: webhookId,
      secret,
      callback_url: body.callback_url,
      types: body.types ?? ["v1/transactions"],
      status: "active",
    });
  } catch (error) {
    console.error("Webhook creation error:", error);
    return NextResponse.json(
      { error: "server_error", message: "Internal server error" },
      { status: 500 },
    );
  }
}

export function GET(request: Request) {
  // Basic auth check
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error: "unauthorized",
        message: "Missing or invalid authorization header",
      },
      { status: 401 },
    );
  }

  // Return all subscriptions
  const subscriptions = Array.from(webhookSubscriptions.entries()).map(
    ([id, sub]) => ({
      id,
      callback_url: sub.callbackUrl,
      types: sub.types,
      status: "active",
    }),
  );

  return NextResponse.json({ subscriptions });
}
