import { NextResponse } from "next/server";

interface TokenRequest {
  grant_type: string;
  code?: string;
  refresh_token?: string;
  redirect_uri?: string;
  client_id: string;
  client_secret: string;
}

function generateTokens(clientId: string) {
  // Generate a dummy JWT-like token (not cryptographically signed, just base64)
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: "test_user_001",
      iat: now,
      exp: now + 30 * 24 * 60 * 60, // 30 days
      scope: "accounts transactions webhooks",
      client_id: clientId,
    }),
  ).toString("base64url");
  const signature = Buffer.from("test_signature_not_verified").toString(
    "base64url",
  );

  const accessToken = `${header}.${payload}.${signature}`;
  const refreshToken = `test_refresh_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  return { accessToken, refreshToken };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TokenRequest;

    // Handle different grant types
    if (body.grant_type === "refresh_token") {
      // Validate refresh token is provided
      if (!body.refresh_token) {
        return NextResponse.json(
          {
            error: "invalid_request",
            error_description: "Missing refresh_token",
          },
          { status: 400 },
        );
      }

      // For test bank, accept any refresh token that starts with "test_refresh_"
      if (!body.refresh_token.startsWith("test_refresh_")) {
        return NextResponse.json(
          {
            error: "invalid_grant",
            error_description: "Invalid refresh token",
          },
          { status: 400 },
        );
      }

      const { accessToken, refreshToken } = generateTokens(body.client_id);

      return NextResponse.json({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
        scope: "accounts transactions webhooks",
      });
    }

    // Handle authorization_code grant (default)
    if (!body.code) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing code" },
        { status: 400 },
      );
    }

    const { accessToken, refreshToken } = generateTokens(body.client_id);

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 30 * 24 * 60 * 60, // 30 days in seconds
      scope: "accounts transactions webhooks",
    });
  } catch (error) {
    console.error("Token endpoint error:", error);
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error" },
      { status: 500 },
    );
  }
}
