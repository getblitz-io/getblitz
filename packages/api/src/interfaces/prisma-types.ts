/**
 * Prisma composite types with relations
 */

import type { Prisma } from "@getblitz/database";

export type PaymentSessionWithRelations = Prisma.PaymentSessionGetPayload<{
  include: {
    organization: {
      include: {
        webhooks: true;
      };
    };
    bankAccount: {
      include: {
        organizationBankConnection: true;
      };
    };
  };
}>;

export type OrganizationWithDetails = Prisma.OrganizationGetPayload<{
  include: {
    organizationBankConnections: {
      orderBy: { createdAt: "desc" };
      select: {
        id: true;
        providerId: true;
        providerConfig: true;
        credentials: true;
        webhookUrl: true;
        webhookSecret: true;
        status: true;
        expiresAt: true;
        createdAt: true;
        updatedAt: true;
        bankAccounts: {
          select: {
            id: true;
            accountName: true;
            accountIban: true;
            accountBic: true;
            isDefault: true;
          };
          orderBy: { createdAt: "desc" };
        };
      };
    };
    webhooks: {
      orderBy: { createdAt: "desc" };
      select: {
        id: true;
        webhookUrl: true;
        webhookSecret: true;
        notifyPaymentSuccess: true;
        notifyPaymentFailed: true;
        notifyPaymentExpired: true;
        notifyPaymentAbandoned: true;
      };
    };
    _count: {
      select: {
        paymentSessions: true;
        members: true;
        organizationBankConnections: true;
        webhooks: true;
      };
    };
  };
}>;

export type PaymentSessionWithOrg = Prisma.PaymentSessionGetPayload<{
  include: {
    organization: { select: { id: true; name: true } };
    bankAccount: true;
  };
}>;

export type BankAccountWithOrganizationBankConnection =
  Prisma.BankAccountGetPayload<{
    include: {
      organizationBankConnection: true;
    };
  }>;

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    organization: true;
    paymentSession: {
      include: {
        bankAccount: {
          include: {
            organizationBankConnection: true;
          };
        };
      };
    };
    bankAccount: {
      include: {
        organizationBankConnection: true;
      };
    };
  };
}>;
export type InvoiceWithOrg = Prisma.InvoiceGetPayload<{
  include: {
    organization: { select: { id: true; name: true; logo: true } };
    paymentSession: { select: { status: true; expiresAt: true } };
    bankAccount: {
      include: {
        organizationBankConnection: true;
      };
    };
  };
}>;
