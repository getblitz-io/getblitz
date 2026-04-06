import { createSwaggerSpec } from "next-swagger-doc";

export function GET() {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api/v1",
    definition: {
      openapi: "3.0.0",
      info: { title: "Blitz API", version: "1.0" },
      components: {
        securitySchemes: {
          BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
          ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" },
        },
        schemas: {
          // ─── Error ───────────────────────────────────────────────────
          Error: {
            type: "object",
            properties: {
              error: { type: "string", example: "Resource not found" },
              details: {
                type: "object",
                description: "Additional validation or error details",
              },
            },
            required: ["error"],
          },

          // ─── Organization ─────────────────────────────────────────────
          Organization: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid", example: "01929f5a-..." },
              name: { type: "string", example: "Acme Corp" },
              slug: { type: "string", example: "acme-corp" },
              logo: {
                type: "string",
                nullable: true,
                example: "https://example.com/logo.png",
              },
              createdAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
              allowedOrigins: {
                type: "array",
                items: { type: "string" },
                example: ["https://example.com"],
              },
            },
            required: ["id", "name", "slug", "createdAt"],
          },

          // ─── Customer ─────────────────────────────────────────────────
          Customer: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid", example: "01929f5a-..." },
              organizationId: {
                type: "string",
                format: "uuid",
                example: "01929f5a-...",
              },
              email: {
                type: "string",
                format: "email",
                example: "customer@example.com",
              },
              name: {
                type: "string",
                nullable: true,
                example: "John Doe",
              },
              address: {
                type: "string",
                nullable: true,
                example: "123 Main St, Berlin, Germany",
              },
              taxId: {
                type: "string",
                nullable: true,
                example: "DE123456789",
              },
              createdAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
            },
            required: ["id", "organizationId", "createdAt", "updatedAt"],
          },

          CreateCustomerInput: {
            type: "object",
            required: ["email"],
            properties: {
              email: {
                type: "string",
                format: "email",
                example: "customer@example.com",
              },
              name: { type: "string", example: "John Doe" },
              address: {
                type: "string",
                example: "123 Main St, Berlin, Germany",
              },
              taxId: { type: "string", example: "DE123456789" },
            },
          },

          UpdateCustomerInput: {
            type: "object",
            properties: {
              email: {
                type: "string",
                format: "email",
                example: "updated@example.com",
              },
              name: { type: "string", example: "Jane Doe" },
              address: { type: "string", example: "456 New St, Munich" },
              taxId: { type: "string", example: "DE987654321" },
            },
          },

          // ─── Line Item ────────────────────────────────────────────────
          LineItem: {
            type: "object",
            required: ["description", "quantity", "unitPriceCents"],
            properties: {
              description: {
                type: "string",
                maxLength: 255,
                example: "Consulting Services",
              },
              quantity: {
                type: "number",
                minimum: 0,
                exclusiveMinimum: true,
                example: 2,
              },
              unitPriceCents: {
                type: "integer",
                example: 15000,
                description: "Unit price in cents (e.g., 15000 = €150.00)",
              },
            },
          },

          // ─── Invoice ─────────────────────────────────────────────────
          Invoice: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid", example: "01929f5a-..." },
              organizationId: {
                type: "string",
                format: "uuid",
                example: "01929f5a-...",
              },
              referenceId: {
                type: "string",
                example: "REF-2024-001",
                description:
                  "Unique short reference ID used in payment URLs and SEPA transfers",
              },
              status: {
                type: "string",
                enum: ["DRAFT", "FINALIZED", "PAID", "CANCELLED"],
                example: "DRAFT",
              },
              customerId: {
                type: "string",
                format: "uuid",
                nullable: true,
                example: "01929f5a-...",
              },
              customerEmail: {
                type: "string",
                format: "email",
                nullable: true,
                example: "customer@example.com",
              },
              customerName: {
                type: "string",
                nullable: true,
                example: "John Doe",
              },
              customerAddress: {
                type: "string",
                nullable: true,
                example: "123 Main St, Berlin",
              },
              customerTaxId: {
                type: "string",
                nullable: true,
                example: "DE123456789",
              },
              description: {
                type: "string",
                nullable: true,
                example: "Monthly retainer",
              },
              notes: {
                type: "string",
                nullable: true,
                example: "Payment due within 30 days",
              },
              invoiceNumber: {
                type: "string",
                nullable: true,
                example: "INV-2024-001",
              },
              currency: { type: "string", enum: ["EUR"], example: "EUR" },
              lineItems: {
                type: "array",
                items: { $ref: "#/components/schemas/LineItem" },
              },
              subtotalCents: {
                type: "integer",
                example: 30000,
                description: "Sum of line items before tax/discount in cents",
              },
              taxRateBps: {
                type: "integer",
                example: 1900,
                description: "Tax rate in basis points (e.g., 1900 = 19%)",
              },
              taxAmountCents: {
                type: "integer",
                example: 5700,
                description: "Calculated tax in cents",
              },
              discountCents: {
                type: "integer",
                example: 0,
                description: "Discount amount in cents",
              },
              totalCents: {
                type: "integer",
                example: 35700,
                description:
                  "Total amount (subtotal + tax - discount) in cents",
              },
              dueDate: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: "2024-02-15T00:00:00Z",
              },
              expiresAt: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: "2024-01-20T10:30:00Z",
              },
              bankAccountId: {
                type: "string",
                format: "uuid",
                example: "01929f5a-...",
              },
              paymentSessionId: {
                type: "string",
                format: "uuid",
                nullable: true,
                example: "01929f5a-...",
              },
              metadata: {
                type: "object",
                additionalProperties: true,
                nullable: true,
              },
              createdAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
            },
            required: [
              "id",
              "organizationId",
              "referenceId",
              "status",
              "currency",
              "subtotalCents",
              "taxRateBps",
              "taxAmountCents",
              "discountCents",
              "totalCents",
              "bankAccountId",
              "createdAt",
              "updatedAt",
            ],
          },

          CreateInvoiceInput: {
            type: "object",
            required: [
              "customerEmail",
              "slug",
              "amountCents",
              "subtotalCents",
              "bankAccountId",
            ],
            properties: {
              slug: {
                type: "string",
                example: "acme-corp",
                description: "Organization slug",
              },
              customerEmail: {
                type: "string",
                format: "email",
                example: "customer@example.com",
              },
              customerName: { type: "string", example: "John Doe" },
              customerAddress: {
                type: "string",
                example: "123 Main St, Berlin",
              },
              customerTaxId: { type: "string", example: "DE123456789" },
              customerId: { type: "string", format: "uuid" },
              description: { type: "string", example: "Monthly retainer" },
              notes: { type: "string", example: "Net 30" },
              invoiceNumber: { type: "string", example: "INV-2024-001" },
              currency: { type: "string", enum: ["EUR"], default: "EUR" },
              lineItems: {
                type: "array",
                items: { $ref: "#/components/schemas/LineItem" },
              },
              amountCents: {
                type: "integer",
                example: 35700,
                description: "Total amount in cents",
              },
              subtotalCents: {
                type: "integer",
                example: 30000,
                description: "Subtotal in cents",
              },
              taxRateBps: {
                type: "integer",
                default: 0,
                example: 1900,
                description: "Tax rate in basis points",
              },
              taxAmountCents: {
                type: "integer",
                default: 0,
                example: 5700,
              },
              discountCents: { type: "integer", default: 0, example: 0 },
              bankAccountId: { type: "string", format: "uuid" },
              merchantReferenceId: {
                type: "string",
                maxLength: 64,
                example: "order-123",
              },
              dueDate: { type: "string", format: "date-time" },
              expiresInMinutes: {
                type: "integer",
                nullable: true,
                example: 1440,
                description:
                  "Expiration time in minutes (null = no expiration)",
              },
              password: {
                type: "string",
                minLength: 4,
                maxLength: 100,
                description: "Optional password to protect the invoice",
              },
              metadata: {
                type: "object",
                additionalProperties: {
                  oneOf: [
                    { type: "string" },
                    { type: "number" },
                    { type: "boolean" },
                  ],
                },
              },
            },
          },

          UpdateInvoiceInput: {
            type: "object",
            properties: {
              customerEmail: { type: "string", format: "email" },
              customerName: { type: "string" },
              customerAddress: { type: "string" },
              customerTaxId: { type: "string" },
              description: { type: "string" },
              notes: { type: "string" },
              invoiceNumber: { type: "string" },
              currency: { type: "string", enum: ["EUR"] },
              lineItems: {
                type: "array",
                items: { $ref: "#/components/schemas/LineItem" },
              },
              subtotalCents: { type: "integer" },
              taxRateBps: { type: "integer" },
              taxAmountCents: { type: "integer" },
              discountCents: { type: "integer" },
              dueDate: { type: "string", format: "date-time" },
              password: { type: "string", minLength: 4, maxLength: 100 },
              metadata: { type: "object", additionalProperties: true },
            },
          },

          // ─── BankAccount ──────────────────────────────────────────────
          BankAccount: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid", example: "01929f5a-..." },
              externalAccountId: {
                type: "string",
                example: "ext-acc-001",
                description: "Bank provider's unique account ID",
              },
              accountName: {
                type: "string",
                example: "Main Business Account",
              },
              accountIban: {
                type: "string",
                example: "DE89370400440532013000",
              },
              accountBic: { type: "string", example: "COBADEFFXXX" },
              currency: {
                type: "string",
                enum: ["EUR", "USDC"],
                example: "EUR",
              },
              isDefault: { type: "boolean", example: true },
              status: {
                type: "string",
                enum: ["ENABLED", "DISABLED", "BLOCKED"],
                example: "ENABLED",
              },
              organizationBankConnectionId: {
                type: "string",
                format: "uuid",
                example: "01929f5a-...",
              },
              createdAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
            },
            required: [
              "id",
              "externalAccountId",
              "accountName",
              "accountIban",
              "accountBic",
              "currency",
              "isDefault",
              "status",
              "organizationBankConnectionId",
              "createdAt",
              "updatedAt",
            ],
          },

          // ─── PaymentSession ───────────────────────────────────────────
          PaymentSession: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid", example: "01929f5a-..." },
              organizationId: { type: "string", format: "uuid" },
              referenceId: {
                type: "string",
                example: "GB29NWBK60161331926819",
                description: "Unique short reference used in SEPA transfers",
              },
              merchantReferenceId: {
                type: "string",
                nullable: true,
                example: "order-123",
              },
              amountCents: {
                type: "integer",
                example: 5000,
                description: "Amount in cents (e.g., 5000 = €50.00)",
              },
              currency: {
                type: "string",
                enum: ["EUR", "USDC"],
                example: "EUR",
              },
              amountPaidCents: {
                type: "integer",
                example: 0,
                description: "Amount already paid in cents",
              },
              status: {
                type: "string",
                enum: ["PENDING", "PARTIAL", "PAID", "FAILED", "EXPIRED"],
                example: "PENDING",
              },
              expiresAt: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: "2024-01-15T11:00:00Z",
              },
              bankAccountId: { type: "string", format: "uuid" },
              metadata: {
                type: "object",
                additionalProperties: true,
                nullable: true,
              },
              createdAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
            },
            required: [
              "id",
              "organizationId",
              "referenceId",
              "amountCents",
              "currency",
              "amountPaidCents",
              "status",
              "bankAccountId",
              "createdAt",
              "updatedAt",
            ],
          },
          Transaction: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              txHash: { type: "string", example: "0x123..." },
              amountCents: { type: "integer", example: 5000 },
              currency: { type: "string", enum: ["EUR"], example: "EUR" },
              status: {
                type: "string",
                enum: ["PENDING", "COMPLETED", "FAILED", "EXPIRED"],
                example: "COMPLETED",
              },
              customerName: {
                type: "string",
                nullable: true,
                example: "John Doe",
              },
              createdAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
            },
            required: [
              "id",
              "txHash",
              "amountCents",
              "currency",
              "status",
              "createdAt",
            ],
          },

          PaymentSessionDetails: {
            type: "object",
            description:
              "Extended session details including organization and bank account info",
            properties: {
              sessionId: { type: "string", format: "uuid" },
              referenceId: {
                type: "string",
                example: "GB29NWBK601613319268192",
              },
              amountCents: { type: "integer", example: 5000 },
              currency: { type: "string", enum: ["EUR"], example: "EUR" },
              status: {
                type: "string",
                enum: ["PENDING", "PARTIAL", "PAID", "FAILED", "EXPIRED"],
                example: "PENDING",
              },
              expiresAt: {
                type: "string",
                format: "date-time",
                nullable: true,
              },
              organization: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Acme Corp" },
                },
                required: ["name"],
              },
              bankAccount: {
                type: "object",
                properties: {
                  providerId: { type: "string", example: "qonto" },
                  accountName: {
                    type: "string",
                    example: "Main Business Account",
                  },
                  iban: { type: "string", example: "DE89370400440532013000" },
                },
                required: ["providerId", "accountName", "iban"],
              },
              amountPaidCents: { type: "integer", example: 0 },
              merchantReferenceId: {
                type: "string",
                nullable: true,
                example: "order-123",
              },
              metadata: {
                type: "object",
                additionalProperties: true,
                nullable: true,
              },
              createdAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
              updatedAt: {
                type: "string",
                format: "date-time",
                example: "2024-01-15T10:30:00Z",
              },
              transactions: {
                type: "array",
                items: { $ref: "#/components/schemas/Transaction" },
              },
            },
            required: [
              "sessionId",
              "referenceId",
              "amountCents",
              "currency",
              "status",
              "organization",
              "bankAccount",
              "amountPaidCents",
              "createdAt",
              "updatedAt",
              "transactions",
            ],
          },

          QrCodeResponse: {
            type: "object",
            properties: {
              qrCode: {
                type: "string",
                example: "data:image/png;base64,iVBORw0KGgo...",
                description: "Base64 encoded QR code image (data URL)",
              },
            },
            required: ["qrCode"],
          },

          // ─── Challenge ────────────────────────────────────────────────
          CreateChallengeInput: {
            type: "object",
            required: ["amount"],
            properties: {
              amount: {
                type: "integer",
                example: 500,
                description: "Amount in cents (e.g., 500 = €5.00)",
              },
              currency: {
                type: "string",
                enum: ["EUR", "USDC"],
                default: "EUR",
              },
              bankAccountId: {
                type: "string",
                format: "uuid",
                description:
                  "Specific bank account ID to use, or omit to use the default",
              },
              merchantReferenceId: {
                type: "string",
                maxLength: 64,
                pattern: "^[a-zA-Z0-9_-]+$",
                example: "order-abc-123",
                description:
                  "Your own reference ID for this payment (must be unique per org)",
              },
              metadata: {
                type: "object",
                additionalProperties: { type: "string" },
                example: { orderId: "12345", customerId: "cust-001" },
              },
              expiresInMinutes: {
                type: "integer",
                nullable: true,
                example: 15,
                description:
                  "Expiration time in minutes. Null means no expiration. Defaults to 15.",
              },
              redirectUrl: {
                type: "string",
                format: "uri",
                example:
                  "https://example.com/redirect?success=true&sessionId=...",
                description:
                  "URL to redirect to after payment. If not provided, the user will be redirected to the default success page.",
              },
            },
          },

          CreateChallengeResponse: {
            type: "object",
            properties: {
              sessionId: {
                type: "string",
                format: "uuid",
                example: "01929f5a-...",
              },
              referenceId: {
                type: "string",
                maxLength: 35,
                example: "GB29NWBK601613319268192",
                description:
                  "Unique short reference used for SEPA bank transfer identification",
              },
              merchantReferenceId: {
                type: "string",
                nullable: true,
                example: "order-abc-123",
              },
              paymentUrl: {
                type: "string",
                format: "uri",
                example: "https://app.getblitz.io/pay/GB29NWBK601613319268192",
              },
              expiresAt: {
                type: "string",
                format: "date-time",
                nullable: true,
                example: "2024-01-15T10:45:00Z",
              },
            },
            required: ["sessionId", "referenceId", "paymentUrl"],
          },

          SimulatePaymentResponse: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              message: {
                type: "string",
                example: "Payment simulated successfully",
              },
              sessionId: { type: "string", format: "uuid" },
            },
            required: ["success", "sessionId"],
          },
        },
      },
      security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
    },
  });

  return Response.json(spec);
}
