import { NextResponse } from "next/server";

interface SendWebhookRequest {
  reference: string;
  amount: number;
  webhookUrl: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendWebhookRequest;

    // Validate reference format
    if (!body.reference || !/^GB-[A-Z0-9]{8}$/i.test(body.reference.trim())) {
      return NextResponse.json(
        { error: "Invalid reference format. Expected: GB-XXXXXXXX" },
        { status: 400 },
      );
    }

    // Validate amount
    if (!body.amount || isNaN(body.amount) || body.amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Please enter a positive number." },
        { status: 400 },
      );
    }

    // Validate webhook URL
    if (!body.webhookUrl) {
      return NextResponse.json(
        { error: "Webhook URL is required." },
        { status: 400 },
      );
    }

    // Build webhook payload matching Qonto format
    const transactionId = `txn_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const webhookPayload = {
      id: `evt_test_${Date.now()}`,
      type: "v1/transactions",
      data: {
        id: transactionId,
        amount: body.amount,
        currency: "EUR",
        status: "completed",
        reference: body.reference.trim().toUpperCase(),
        note: body.reference.trim().toUpperCase(),
        transaction_id: transactionId,
        bank_account_id: "test-acc-001",
        side: "credit" as const,
        operation_type: "transfer",
      },
    };

    // Send webhook to the specified URL (server-to-server, no CORS issues)
    const response = await fetch(body.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Test-Bank-Signature": "test_signature_not_verified",
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Webhook failed: ${response.status} - ${errorText}` },
        { status: response.status },
      );
    }

    const responseData = (await response.json()) as unknown;

    return NextResponse.json({
      success: true,
      message: `Payment notification sent successfully! Reference: ${body.reference}`,
      data: responseData,
    });
  } catch (error) {
    console.error("Send webhook error:", error);
    return NextResponse.json(
      {
        error: "server_error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
