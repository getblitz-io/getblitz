-- AlterTable
ALTER TABLE "payment_session" ALTER COLUMN "expiresAt" DROP NOT NULL;

-- CreateTable
CREATE TABLE "invoice" (
    "id" VARCHAR(36) NOT NULL,
    "organizationId" VARCHAR(36) NOT NULL,
    "referenceId" VARCHAR(35) NOT NULL,
    "customerId" VARCHAR(36),
    "customerEmail" VARCHAR(255),
    "customerName" VARCHAR(255),
    "customerAddress" TEXT,
    "customerTaxId" VARCHAR(50),
    "description" TEXT,
    "notes" TEXT,
    "dueDate" TIMESTAMP(3),
    "invoiceNumber" VARCHAR(50),
    "lineItems" JSONB,
    "subtotalCents" INTEGER NOT NULL,
    "taxRateBps" INTEGER NOT NULL DEFAULT 0,
    "taxAmountCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "passwordHash" VARCHAR(255),
    "paymentSessionId" VARCHAR(36) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" VARCHAR(36) NOT NULL,
    "organizationId" VARCHAR(36) NOT NULL,
    "email" VARCHAR(255),
    "name" VARCHAR(255),
    "address" TEXT,
    "taxId" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_referenceId_key" ON "invoice"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_paymentSessionId_key" ON "invoice"("paymentSessionId");

-- CreateIndex
CREATE INDEX "invoice_organizationId_idx" ON "invoice"("organizationId");

-- CreateIndex
CREATE INDEX "invoice_referenceId_idx" ON "invoice"("referenceId");

-- CreateIndex
CREATE INDEX "invoice_customerId_idx" ON "invoice"("customerId");

-- CreateIndex
CREATE INDEX "customer_organizationId_idx" ON "customer"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_email_organizationId_key" ON "customer"("email", "organizationId");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "payment_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
