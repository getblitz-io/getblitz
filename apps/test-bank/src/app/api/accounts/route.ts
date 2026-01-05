import { NextResponse } from "next/server";

// Fake test accounts with realistic-looking but obviously fake IBANs
const FAKE_ACCOUNTS = [
  {
    id: "test-acc-001",
    name: "Test Business Account",
    iban: "TEST1234567890123456",
    currency: "EUR",
    bic: "TESTBICXXX",
    balance: 10000.0,
  },
  {
    id: "test-acc-002",
    name: "Test Savings Account",
    iban: "TEST9876543210987654",
    currency: "EUR",
    bic: "TESTBICXXX",
    balance: 50000.0,
  },
  {
    id: "test-acc-003",
    name: "Test EUR Account",
    iban: "TEST5555666677778888",
    currency: "EUR",
    bic: "TESTBICXXX",
    balance: 25000.0,
  },
];

export function GET(request: Request) {
  // Basic auth check (just verify header exists, don't validate token)
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

  return NextResponse.json({
    accounts: FAKE_ACCOUNTS,
  });
}
