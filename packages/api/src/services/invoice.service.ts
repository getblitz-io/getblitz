import bcrypt from "bcryptjs";

import type { Invoice, PrismaClient } from "@getblitz/database";

import type {
  CreateInvoiceInput,
  CreateInvoiceResult,
  ICustomerService,
  IInvoiceRepository,
  IInvoiceService,
  InvoiceDetailsResult,
  InvoiceLineItem,
  InvoiceWithOrg,
  IPaymentSessionService,
  UpdateInvoiceInput,
} from "../interfaces";
import { centsToEuros, generateSepaQrString } from "../utils/sepa-qr";

export class InvoiceService implements IInvoiceService {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly paymentSessionService: IPaymentSessionService,
    private readonly customerService: ICustomerService,
    private readonly prisma: PrismaClient,
  ) {}

  async createInvoice({
    input,
    baseUrl,
  }: {
    input: CreateInvoiceInput;
    baseUrl: string;
  }): Promise<CreateInvoiceResult> {
    return this.prisma.$transaction(async (tx) => {
      const customer = await this.customerService.getOrCreateCustomer(
        {
          organizationId: input.organizationId,
          email: input.customerEmail,
          name: input.customerName,
          address: input.customerAddress,
          taxId: input.customerTaxId,
        },
        tx,
      );
      // 1. Create payment session with extended/no expiration
      const challengeResult = await this.paymentSessionService.createChallenge(
        {
          input: {
            organizationId: input.organizationId,
            amount: input.amountCents,
            currency: input.currency,
            bankAccountId: input.bankAccountId,
            merchantReferenceId: input.merchantReferenceId,
          },
          baseUrl,
          expiresInMinutes: input.expiresInMinutes,
        },
        tx,
      );

      // 2. Generate invoice reference
      const invoiceRef = this.generateInvoiceReferenceId();

      // 3. Hash password if provided
      let passwordHash: string | undefined;
      if (input.password) {
        passwordHash = await bcrypt.hash(input.password, 10);
      }

      // 4. Create invoice record with all financial details
      const invoice = await this.invoiceRepository.create(
        {
          data: {
            organizationId: input.organizationId,
            referenceId: invoiceRef,
            paymentSessionId: challengeResult.sessionId,
            // Customer info
            customerId: customer.id,
            customerEmail: customer.email,
            customerName: customer.name,
            customerAddress: customer.address,
            customerTaxId: customer.taxId,
            // Invoice content
            description: input.description,
            notes: input.notes,
            dueDate: input.dueDate,
            invoiceNumber: input.invoiceNumber,
            // Financial details
            lineItems: input.lineItems,
            subtotalCents: input.subtotalCents,
            taxRateBps: input.taxRateBps ?? 0,
            taxAmountCents: input.taxAmountCents ?? 0,
            discountCents: input.discountCents ?? 0,
            // Security
            passwordHash,
            metadata: input.metadata,
          },
        },
        tx,
      );

      return {
        invoiceId: invoice.id,
        referenceId: invoice.referenceId,
        invoiceUrl: `${baseUrl}/invoice/${invoice.id}`,
        paymentUrl: challengeResult.paymentUrl,
        expiresAt: challengeResult.expiresAt,
      };
    });
  }

  async getInvoiceDetails({
    invoiceId,
    password,
  }: {
    invoiceId: string;
    password?: string;
  }): Promise<InvoiceDetailsResult | null> {
    const invoice = await this.invoiceRepository.findById({ id: invoiceId });
    if (!invoice) return null;

    const session = invoice.paymentSession;
    let isUnlocked = true;

    if (invoice.passwordHash) {
      if (!password) {
        isUnlocked = false;
      } else {
        const isValid = await bcrypt.compare(password, invoice.passwordHash);
        if (!isValid) {
          isUnlocked = false;
        }
      }
    }

    const sensitiveData = isUnlocked
      ? {
          lineItems: invoice.lineItems as unknown as InvoiceLineItem[] | null,
          subtotalCents: invoice.subtotalCents,
          taxRateBps: invoice.taxRateBps,
          taxAmountCents: invoice.taxAmountCents,
          discountCents: invoice.discountCents,
          customerEmail: invoice.customerEmail,
          customerName: invoice.customerName,
          customerAddress: invoice.customerAddress,
          customerTaxId: invoice.customerTaxId,
          notes: invoice.notes,
        }
      : {
          lineItems: null,
          subtotalCents: 0,
          taxRateBps: 0,
          taxAmountCents: 0,
          discountCents: 0,
          customerEmail: null,
          customerName: null,
          customerAddress: null,
          customerTaxId: null,
          notes: null,
        };

    return {
      invoiceId: invoice.id,
      referenceId: invoice.referenceId,
      invoiceNumber: invoice.invoiceNumber,

      // Financial summary
      amountCents: session.amountCents,
      currency: session.currency,
      subtotalCents: sensitiveData.subtotalCents,
      taxRateBps: sensitiveData.taxRateBps,
      taxAmountCents: sensitiveData.taxAmountCents,
      discountCents: sensitiveData.discountCents,
      lineItems: sensitiveData.lineItems,

      // Status
      status: session.status,
      expiresAt: session.expiresAt ? session.expiresAt.toISOString() : null,
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,

      // Customer info
      customerEmail: sensitiveData.customerEmail,
      customerName: sensitiveData.customerName,
      customerAddress: sensitiveData.customerAddress,
      customerTaxId: sensitiveData.customerTaxId,

      // Invoice content
      description: invoice.description,
      notes: sensitiveData.notes,

      // Organization with logo
      organization: {
        name: invoice.organization.name,
        logo: invoice.organization.logo,
      },

      // Security
      isPasswordProtected: !!invoice.passwordHash,

      // Payment session
      paymentSession: {
        sessionId: session.id,
        referenceId: session.referenceId,
        amountCents: session.amountCents,
        currency: session.currency,
        status: session.status,
        expiresAt: session.expiresAt ? session.expiresAt.toISOString() : null,
        organization: {
          name: invoice.organization.name,
        },
        bankAccount: {
          organizationBankConnection:
            session.bankAccount.organizationBankConnection,
          accountName: session.bankAccount.accountName,
          iban: session.bankAccount.accountIban,
          walletAddressEvm: undefined,
        },
        provider: {
          id: session.bankAccount.organizationBankConnection.providerId,
          displayName: "Bank Provider",
          domain: "",
        },
        sepaQrString: generateSepaQrString({
          name: invoice.organization.name,
          iban: session.bankAccount.accountIban,
          amount: centsToEuros(session.amountCents),
          reference: session.referenceId,
          currency: "EUR",
        }),
      },
    };
  }

  async getInvoiceByReference({
    referenceId,
    password,
  }: {
    referenceId: string;
    password?: string;
  }): Promise<InvoiceDetailsResult | null> {
    const invoice = await this.invoiceRepository.findByReferenceId({
      referenceId,
    });
    if (!invoice) return null;

    return this.getInvoiceDetails({ invoiceId: invoice.id, password });
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
  }: {
    input: UpdateInvoiceInput;
  }): Promise<Invoice> {
    // Hash password if provided
    let passwordHash: string | undefined;
    if (input.password) {
      passwordHash = await bcrypt.hash(input.password, 10);
    }

    return this.invoiceRepository.update({
      id: input.id,
      organizationId: input.organizationId,
      data: {
        customerId: input.customerId,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        customerAddress: input.customerAddress,
        customerTaxId: input.customerTaxId,
        description: input.description,
        notes: input.notes,
        dueDate: input.dueDate,
        invoiceNumber: input.invoiceNumber,
        lineItems: input.lineItems,
        subtotalCents: input.subtotalCents,
        taxRateBps: input.taxRateBps,
        taxAmountCents: input.taxAmountCents,
        discountCents: input.discountCents,
        passwordHash,
        metadata: input.metadata,
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
    return this.invoiceRepository.delete({ id, organizationId });
  }

  private generateInvoiceReferenceId(): string {
    // Generate a short, readable reference ID
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${random}`;
  }
}
