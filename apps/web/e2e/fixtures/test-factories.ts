import { prisma } from "@getblitz/database";

export async function createTestBankAccount(organizationId: string) {
  const rand = Math.floor(Math.random() * 10000000);
  // Create bank connection first
  const connection = await prisma.organizationBankConnection.create({
    data: {
      id: `conn-${Date.now()}-${rand}`,
      organizationId,
      providerId: "test-bank",
      name: "Test Bank Connection",
      status: "CONNECTED",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create bank account linked to the connection
  const account = await prisma.bankAccount.create({
    data: {
      id: `acc-${Date.now()}-${rand}`,
      externalAccountId: `ext-${Date.now()}-${rand}`,
      accountName: "E2E Test Account",
      accountIban: `DE8937040044053201${Math.floor(1000 + Math.random() * 9000)}`,
      accountBic: "TESTDEFFXXX",
      currency: "EUR",
      organizationBankConnectionId: connection.id,
      status: "ENABLED",
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return { connection, account };
}

export async function createTestPaymentSession(params: {
  organizationId: string;
  bankAccountId: string;
  amountCents?: number;
}) {
  const referenceId = `ref_${Date.now()}`;
  return prisma.paymentSession.create({
    data: {
      id: `sess-${Date.now()}`,
      organizationId: params.organizationId,
      referenceId,
      merchantReferenceId: `mref_${Date.now()}`,
      amountCents: params.amountCents ?? 1000,
      currency: "EUR",
      amountPaidCents: 0,
      status: "PENDING",
      bankAccountId: params.bankAccountId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function createTestCustomer(
  organizationId: string,
  email?: string,
) {
  const customerEmail = email ?? `cust-${Date.now()}@e2e.getblitz.io`;
  return prisma.customer.create({
    data: {
      id: `cust-${Date.now()}`,
      organizationId,
      email: customerEmail,
      name: "E2E Customer",
      address: "123 E2E Street, E2E City",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}
