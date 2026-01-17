-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'USDC');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BankConnectionStatus" AS ENUM ('PENDING_CONFIG', 'PENDING_OAUTH', 'CONNECTED', 'DISCONNECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BankAccountStatus" AS ENUM ('ENABLED', 'DISABLED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "activeOrganizationId" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_bank_account" (
    "id" VARCHAR(36) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerId" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255),
    "callbackId" VARCHAR(255),
    "providerConfig" TEXT,
    "credentials" TEXT,
    "callbackUrl" TEXT,
    "isSandbox" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "status" "BankConnectionStatus" NOT NULL DEFAULT 'PENDING_CONFIG',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_bank_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_secret_key" (
    "id" VARCHAR(36) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_secret_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_webhook" (
    "id" VARCHAR(36) NOT NULL,
    "organizationId" VARCHAR(36) NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "notifyPaymentSuccess" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentFailed" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentExpired" BOOLEAN NOT NULL DEFAULT false,
    "notifyPaymentAbandoned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_account" (
    "id" VARCHAR(36) NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountIban" TEXT NOT NULL,
    "accountBic" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'EUR',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "organizationBankConnectionId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "BankAccountStatus" NOT NULL DEFAULT 'ENABLED',

    CONSTRAINT "bank_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_session" (
    "id" VARCHAR(36) NOT NULL,
    "organizationId" VARCHAR(36) NOT NULL,
    "referenceId" VARCHAR(35) NOT NULL,
    "merchantReferenceId" VARCHAR(64),
    "amountCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'EUR',
    "amountPaidCents" INTEGER NOT NULL,
    "amountPaidCurrency" "Currency" NOT NULL DEFAULT 'EUR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "clientToken" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bankAccountId" VARCHAR(36) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "payment_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" VARCHAR(36) NOT NULL,
    "paymentSessionId" VARCHAR(36) NOT NULL,
    "txHash" VARCHAR(255) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'EUR',
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "customerIban" VARCHAR(34),
    "customerBic" VARCHAR(11),
    "customerName" VARCHAR(255),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "organization_bank_account_organizationId_idx" ON "organization_bank_account"("organizationId");

-- CreateIndex
CREATE INDEX "organization_bank_account_providerId_idx" ON "organization_bank_account"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_bank_account_callbackId_organizationId_key" ON "organization_bank_account"("callbackId", "organizationId");

-- CreateIndex
CREATE INDEX "organization_webhook_organizationId_idx" ON "organization_webhook"("organizationId");

-- CreateIndex
CREATE INDEX "bank_account_accountIban_organizationBankConnectionId_idx" ON "bank_account"("accountIban", "organizationBankConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_account_externalAccountId_organizationBankConnectionId_key" ON "bank_account"("externalAccountId", "organizationBankConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_account_accountIban_organizationBankConnectionId_key" ON "bank_account"("accountIban", "organizationBankConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_session_referenceId_key" ON "payment_session"("referenceId");

-- CreateIndex
CREATE INDEX "payment_session_organizationId_idx" ON "payment_session"("organizationId");

-- CreateIndex
CREATE INDEX "payment_session_referenceId_idx" ON "payment_session"("referenceId");

-- CreateIndex
CREATE INDEX "payment_session_merchantReferenceId_idx" ON "payment_session"("merchantReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_session_organizationId_merchantReferenceId_key" ON "payment_session"("organizationId", "merchantReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_txHash_key" ON "transaction"("txHash");

-- CreateIndex
CREATE INDEX "transaction_paymentSessionId_idx" ON "transaction"("paymentSessionId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_bank_account" ADD CONSTRAINT "organization_bank_account_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_secret_key" ADD CONSTRAINT "organization_secret_key_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_webhook" ADD CONSTRAINT "organization_webhook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_organizationBankConnectionId_fkey" FOREIGN KEY ("organizationBankConnectionId") REFERENCES "organization_bank_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_session" ADD CONSTRAINT "payment_session_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_session" ADD CONSTRAINT "payment_session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_paymentSessionId_fkey" FOREIGN KEY ("paymentSessionId") REFERENCES "payment_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
