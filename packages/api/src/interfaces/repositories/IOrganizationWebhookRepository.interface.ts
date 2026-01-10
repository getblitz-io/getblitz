import type { OrganizationWebhook } from "@getblitz/database";

import type { CreateWebhookInput, UpdateWebhookInput } from "..";

export interface IOrganizationWebhookRepository {
  findById({ id }: { id: string }): Promise<OrganizationWebhook | null>;
  findByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<OrganizationWebhook[]>;
  create({
    organizationId,
    data,
  }: {
    organizationId: string;
    data: CreateWebhookInput;
  }): Promise<OrganizationWebhook>;
  update({
    id,
    data,
  }: {
    id: string;
    data: UpdateWebhookInput;
  }): Promise<OrganizationWebhook>;
  delete({ id }: { id: string }): Promise<OrganizationWebhook>;
}
