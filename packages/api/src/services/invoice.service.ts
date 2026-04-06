import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import Decimal from "decimal.js";

import type { Invoice, Prisma, PrismaClient } from "@getblitz/database";
import type {
  CreateInvoiceInputSchema,
  UpdateInvoiceInputSchema,
} from "@getblitz/validators";
import { InvoiceStatus, PaymentStatus } from "@getblitz/database";

import type {
  CreateInvoiceResult,
  DeviceDetails,
  ICustomerService,
  IInvoiceRepository,
  IInvoiceService,
  InvoiceDetailsResult,
  InvoiceLineItem,
  InvoiceWithOrg,
  InvoiceWithRelations,
  IPaymentSessionService,
} from "../interfaces";
import { env } from "../env";
import { getRateLimiter } from "../utils";
import { centsToEuros, generateSepaQrString } from "../utils/sepa-qr";

export class InvoiceService implements IInvoiceService {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly paymentSessionService: IPaymentSessionService,
    private readonly customerService: ICustomerService,
    private readonly prisma: PrismaClient,
  ) {}

  async markInvoiceAsFinalized({
    organizationId,
    invoiceId,
  }: {
    organizationId: string;
    invoiceId: string;
  }): Promise<InvoiceWithRelations> {
    const invoice = await this.invoiceRepository.findById({
      id: invoiceId,
      organizationId,
    });
    if (!invoice) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invoice is not in draft state",
      });
    }

    if (invoice.paymentSession) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invoice has a payment session",
      });
    }

    const expiresInMinutes = invoice.expiresAt
      ? Math.round((invoice.expiresAt.getTime() - Date.now()) / 60000)
      : undefined;

    // if expires is less than 10 mins, throw error
    if (expiresInMinutes && expiresInMinutes < 10) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invoice expires in less than 10 minutes",
      });
    }

    return await this.prisma.$transaction(async (tx) => {
      const paymentSession = await this.paymentSessionService.createChallenge(
        {
          input: {
            organizationId,
            bankAccountId: invoice.bankAccountId,
            amount: invoice.totalCents,
            currency: invoice.currency,
            merchantReferenceId: invoice.referenceId,
            metadata: {
              invoiceId: invoice.id,
              referenceId: invoice.referenceId,
            },
            expiresInMinutes,
          },
          baseUrl: env.NEXT_PUBLIC_APP_URL,
        },
        tx,
      );

      return this.invoiceRepository.update({
        id: invoiceId,
        organizationId,
        data: {
          status: InvoiceStatus.FINALIZED,
          paymentSessionId: paymentSession.sessionId,
        },
        tx,
      });
    });
  }

  async createInvoice({
    input,
    organizationId,
    baseUrl,
  }: {
    input: z.infer<typeof CreateInvoiceInputSchema>;
    organizationId: string;
    baseUrl: string;
  }): Promise<CreateInvoiceResult> {
    // check subtotal is > 0 and is the sum of all line items
    const { subtotalCents, taxAmountCents, totalCents } =
      this.calculateTotals(input);

    if (!subtotalCents.equals(new Decimal(input.subtotalCents))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Subtotal does not match the sum of line items",
      });
    }

    if (
      input.taxAmountCents &&
      !taxAmountCents.equals(new Decimal(input.taxAmountCents))
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Tax amount does not match the sum of line items",
      });
    }

    if (!totalCents.equals(new Decimal(input.amountCents))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Total does not match the sum of line items",
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const customer = await this.customerService.getOrCreateCustomer(
        {
          organizationId,
          email: input.customerEmail,
          name: input.customerName,
          address: input.customerAddress,
          taxId: input.customerTaxId,
        },
        tx,
      );

      // 1. Generate invoice reference
      const invoiceRef = this.generateInvoiceReferenceId();

      // 2. Hash password if provided
      let passwordHash: string | undefined;
      if (input.password) {
        passwordHash = await bcrypt.hash(input.password, 10);
      }

      // 3. Create invoice record with all financial details
      const invoice = await this.invoiceRepository.create({
        data: {
          organizationId: organizationId,
          referenceId: invoiceRef,
          // Bank & currency
          bankAccountId: input.bankAccountId,
          currency: input.currency,
          // Customer info
          customerId: customer.id,
          customerEmail: customer.email,
          customerName: customer.name,
          customerAddress: customer.address,
          customerTaxId: customer.taxId,
          // Invoice content
          ...(input.description && { description: input.description }),
          ...(input.notes && { notes: input.notes }),
          ...(input.dueDate && { dueDate: new Date(input.dueDate) }),
          ...(input.invoiceNumber && { invoiceNumber: input.invoiceNumber }),
          // Financial details
          lineItems: input.lineItems,
          subtotalCents: subtotalCents.toNumber(),
          taxRateBps: input.taxRateBps,
          taxAmountCents: taxAmountCents.toNumber(),
          discountCents: input.discountCents,
          totalCents: totalCents.toNumber(),
          // Security
          ...(passwordHash && { passwordHash }),
          ...(input.metadata && { metadata: input.metadata }),
        },
        tx,
      });

      return {
        invoiceId: invoice.id,
        referenceId: invoice.referenceId,
        invoiceUrl: `${baseUrl}/invoice/${invoice.id}`,
      };
    });
  }

  async getInvoiceById({
    invoiceId,
  }: {
    invoiceId: string;
  }): Promise<InvoiceWithRelations | null> {
    const invoice = await this.invoiceRepository.findById({ id: invoiceId });
    if (!invoice) return null;

    return invoice;
  }

  async getInvoiceByReference({
    referenceId,
    password,
    mode,
    deviceDetails,
  }: {
    referenceId: string;
    password?: string;
    mode: "public" | "preview";
    deviceDetails: DeviceDetails;
  }): Promise<InvoiceDetailsResult | null> {
    const invoice = await this.invoiceRepository.findByReferenceId({
      referenceId,
      type: "id",
    });
    if (!invoice) return null;

    if (invoice.status === InvoiceStatus.DRAFT && mode === "public") {
      return null;
    }

    if (invoice.passwordHash && !password) {
      // new password required error should be thrown here
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Password required",
      });
    }

    await this.verifyInvoicePassword({
      password,
      invoice,
      deviceDetails,
    });

    const paymentSession = await this.getPaymentSessionForInvoice({
      invoice,
    });

    return {
      invoiceId: invoice.id,
      referenceId: invoice.referenceId,
      invoiceNumber: invoice.invoiceNumber,

      // Financial summary
      amountCents: paymentSession.amountCents,
      currency: paymentSession.currency,
      subtotalCents: invoice.subtotalCents,
      taxRateBps: invoice.taxRateBps,
      taxAmountCents: invoice.taxAmountCents,
      discountCents: invoice.discountCents,
      lineItems: invoice.lineItems as unknown as InvoiceLineItem[] | null,

      // Status
      status: invoice.status,
      expiresAt: invoice.expiresAt ? invoice.expiresAt.toISOString() : null,
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,

      // Customer info
      customerEmail: invoice.customerEmail,
      customerName: invoice.customerName,
      customerAddress: invoice.customerAddress,
      customerTaxId: invoice.customerTaxId,

      // Invoice content
      description: invoice.description,
      notes: invoice.notes,

      // Organization with logo
      organization: {
        name: invoice.organization.name,
        logo: invoice.organization.logo,
      },

      // Security
      isPasswordProtected: !!invoice.passwordHash,

      // Payment session
      paymentSession,
    };
  }

  async listByOrgIds({
    orgIds,
    options,
  }: {
    orgIds: string[];
    options?: { take?: number };
  }): Promise<InvoiceWithOrg[]> {
    return this.invoiceRepository.findByOrgIds({ orgIds, options });
  }

  async verifyPassword({
    invoiceId,
    password,
  }: {
    invoiceId: string;
    password: string;
  }): Promise<boolean> {
    const invoice = await this.invoiceRepository.findById({ id: invoiceId });
    if (!invoice?.passwordHash) return false;
    return bcrypt.compare(password, invoice.passwordHash);
  }

  async updateInvoice({
    input,
    organizationId,
  }: {
    input: z.infer<typeof UpdateInvoiceInputSchema>;
    organizationId: string;
  }): Promise<InvoiceWithRelations> {
    // Hash password if provided
    let passwordHash: string | undefined;
    if (input.password) {
      passwordHash = await bcrypt.hash(input.password, 10);
    }

    const existingInvoice = await this.invoiceRepository.findById({
      id: input.id,
    });
    if (!existingInvoice) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
    }

    if (existingInvoice.status !== InvoiceStatus.DRAFT) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot update invoice that is not in DRAFT status",
      });
    }

    const lineItems =
      input.lineItems ??
      (existingInvoice.lineItems as unknown as InvoiceLineItem[]);
    const taxRateBps = input.taxRateBps ?? existingInvoice.taxRateBps;
    const discountCents = input.discountCents ?? existingInvoice.discountCents;

    const { subtotalCents, totalCents } = this.calculateTotals({
      lineItems,
      taxRateBps,
      discountCents,
    });

    const dueDate = input.dueDate
      ? new Date(input.dueDate)
      : (existingInvoice.dueDate ?? null);

    return this.invoiceRepository.update({
      id: input.id,
      organizationId,
      data: {
        customerId: input.customerId ?? existingInvoice.customerId,
        customerEmail: input.customerEmail ?? existingInvoice.customerEmail,
        customerName: input.customerName ?? existingInvoice.customerName,
        customerAddress:
          input.customerAddress ?? existingInvoice.customerAddress,
        customerTaxId: input.customerTaxId ?? existingInvoice.customerTaxId,
        description: input.description ?? existingInvoice.description,
        notes: input.notes ?? existingInvoice.notes,
        dueDate,
        invoiceNumber: input.invoiceNumber ?? existingInvoice.invoiceNumber,
        lineItems: (input.lineItems ??
          existingInvoice.lineItems) as Prisma.InputJsonValue,
        subtotalCents: subtotalCents.toNumber(),
        taxRateBps: taxRateBps,
        taxAmountCents: totalCents.toNumber(),
        discountCents: discountCents,
        passwordHash,
        metadata: (input.metadata ??
          existingInvoice.metadata) as Prisma.InputJsonValue,
      },
    });
  }

  async deleteInvoice({
    id,
    organizationId,
  }: {
    id: string;
    organizationId: string;
  }): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findById({
      id,
      organizationId,
    });

    if (!invoice) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
    }

    if (invoice.status === InvoiceStatus.DRAFT) {
      return this.invoiceRepository.delete({ id, organizationId });
    }

    if (
      invoice.status === InvoiceStatus.FINALIZED &&
      invoice.paymentSession?.status !== PaymentStatus.PAID
    ) {
      return this.invoiceRepository.update({
        id,
        organizationId,
        data: {
          status: InvoiceStatus.CANCELLED,
        },
      });
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot delete paid or cancelled invoice",
    });
  }

  private generateInvoiceReferenceId(): string {
    // Generate a short, readable reference ID
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${random}`;
  }

  private calculateTotals({
    lineItems,
    taxRateBps,
    discountCents,
  }: Pick<
    z.infer<typeof CreateInvoiceInputSchema>,
    "lineItems" | "taxRateBps" | "discountCents"
  >): { subtotalCents: Decimal; taxAmountCents: Decimal; totalCents: Decimal } {
    const subtotalCents = lineItems
      .map((item) => new Decimal(item.unitPriceCents).mul(item.quantity))
      .reduce((acc, item) => acc.plus(item), new Decimal(0));

    const taxRate = new Decimal(taxRateBps).div(10000);
    const taxAmountCents = subtotalCents.mul(taxRate).floor();
    const totalCents = subtotalCents.add(taxAmountCents).sub(discountCents);

    return { subtotalCents, taxAmountCents, totalCents };
  }

  private createDraftPaymentSession({
    invoice,
  }: {
    invoice: InvoiceWithRelations;
  }): InvoiceDetailsResult["paymentSession"] {
    return {
      sessionId: "Draft-Session-Id",
      referenceId: invoice.referenceId,
      amountCents: invoice.totalCents,
      amountPaidCents: 0,
      currency: invoice.currency,
      status: PaymentStatus.PENDING,
      expiresAt: invoice.expiresAt ? invoice.expiresAt.toISOString() : null,
      organization: {
        name: invoice.organization.name,
        logo: invoice.organization.logo,
      },
      bankAccount: {
        organizationBankConnection:
          invoice.bankAccount.organizationBankConnection,
        accountName: invoice.bankAccount.accountName,
        iban: invoice.bankAccount.accountIban,
        bic: invoice.bankAccount.accountBic,
        bankName:
          invoice.bankAccount.organizationBankConnection.name ??
          invoice.bankAccount.organizationBankConnection.providerId,
        walletAddressEvm: undefined,
      },
      provider: {
        id: invoice.bankAccount.organizationBankConnection.providerId,
        displayName: "Bank Provider",
        domain: "",
      },
      sepaQrString: generateSepaQrString({
        name: invoice.bankAccount.accountName || invoice.organization.name,
        iban: invoice.bankAccount.accountIban,
        amount: centsToEuros(invoice.totalCents),
        reference: invoice.referenceId,
        currency: "EUR",
      }),
      clientToken: "temporary-token",
      redirectUrl: "",
      merchantReferenceId: null,
      metadata: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transactions: [],
    };
  }

  private async getPaymentSessionForInvoice({
    invoice,
  }: {
    invoice: InvoiceWithRelations;
  }): Promise<InvoiceDetailsResult["paymentSession"]> {
    if (invoice.status === InvoiceStatus.DRAFT) {
      return this.createDraftPaymentSession({ invoice });
    }
    if (!invoice.paymentSession) {
      throw new Error("Payment session not found for invoice");
    }

    const sessionDetails = await this.paymentSessionService.getSessionDetails({
      sessionId: invoice.paymentSession.id,
    });

    if (!sessionDetails) {
      throw new Error("Payment session details not found");
    }

    return sessionDetails;
  }

  private async verifyInvoicePassword({
    password,
    invoice,
    deviceDetails,
  }: {
    password?: string;
    invoice: Pick<InvoiceWithRelations, "passwordHash" | "referenceId">;
    deviceDetails: DeviceDetails;
  }) {
    if (!invoice.passwordHash) return true;

    if (!password) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Password is required",
      });
    }

    const rateLimiter = getRateLimiter({
      keyPrefix: "invoice-password",
      points: 5,
      duration: 60,
      blockDuration: 60,
    });

    if (!rateLimiter)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Rate limiter not configured",
      });

    const rateLimitKey = `${invoice.referenceId}:${deviceDetails.ipAddress}`;

    // Check if blocked
    try {
      const res = await rateLimiter.get(rateLimitKey);
      if (res && res.remainingPoints <= 0 && res.msBeforeNext > 0) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many failed attempts. Please try again later.",
        });
      }
      const isPasswordValid = await bcrypt.compare(
        password,
        invoice.passwordHash,
      );
      if (isPasswordValid) {
        return true;
      }
      await rateLimiter.consume(rateLimitKey);
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid password",
      });
    } catch (e) {
      // If error is TRPCError, rethrow it
      if (e instanceof TRPCError) throw e;
      // Ignore redis errors to allow login if redis is down
      console.error("Rate limiter error", e);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Rate limiter error",
      });
    }
  }
}
