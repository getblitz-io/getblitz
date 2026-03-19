import type { BankAccount, OrganizationWebhook } from "@getblitz/database";

import type {
  AddBankAccountInput,
  CreateOrganizationWebhookInput,
  OrganizationWithDetails,
  UpdateOrganizationWebhookInput,
} from "..";

export interface IOrganizationService {
  getById({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }): Promise<OrganizationWithDetails>;
  getBySlug({
    slug,
    userId,
  }: {
    slug: string;
    userId: string;
  }): Promise<OrganizationWithDetails>;
  update({
    organizationId,
    userId,
    data,
  }: {
    organizationId: string;
    userId: string;
    data: {
      allowedOrigins?: string[];
    };
  }): Promise<OrganizationWithDetails>;
  getPaidCount({ orgId }: { orgId: string }): Promise<number>;

  // Bank account methods
  addBankAccount({
    input,
    userId,
  }: {
    input: AddBankAccountInput;
    userId: string;
  }): Promise<BankAccount>;
  deleteBankAccount({
    bankAccountId,
    userId,
  }: {
    bankAccountId: string;
    userId: string;
  }): Promise<BankAccount>;
  setDefaultBankAccount({
    bankAccountId,
    userId,
  }: {
    bankAccountId: string;
    userId: string;
  }): Promise<void>;

  // Webhook methods (multi-webhook support)
  createWebhook({
    input,
    userId,
  }: {
    input: CreateOrganizationWebhookInput;
    userId: string;
  }): Promise<OrganizationWebhook>;
  updateWebhook({
    input,
    userId,
  }: {
    input: UpdateOrganizationWebhookInput;
    userId: string;
  }): Promise<OrganizationWebhook>;
  deleteWebhook({
    webhookId,
    userId,
  }: {
    webhookId: string;
    userId: string;
  }): Promise<OrganizationWebhook>;
}
