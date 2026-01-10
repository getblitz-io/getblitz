import type { PaymentSession, PaymentStatus } from "@getblitz/database";

import type {
  CreatePaymentSessionInput,
  PaymentSessionWithOrg,
  PaymentSessionWithRelations,
  PaymentStatusStats,
} from "..";

export interface IPaymentSessionRepository {
  findById({ id }: { id: string }): Promise<PaymentSessionWithRelations | null>;
  findByReferenceId({
    referenceId,
  }: {
    referenceId: string;
  }): Promise<PaymentSession | null>;
  findByMerchantReferenceId({
    organizationId,
    merchantReferenceId,
  }: {
    organizationId: string;
    merchantReferenceId: string;
  }): Promise<PaymentSession | null>;
  create({
    data,
  }: {
    data: CreatePaymentSessionInput;
  }): Promise<PaymentSession>;
  updateStatus({
    id,
    status,
  }: {
    id: string;
    status: PaymentStatus;
  }): Promise<PaymentSession>;
  updateStatusWithToken({
    id,
    status,
    clientToken,
  }: {
    id: string;
    status: PaymentStatus;
    clientToken: string;
  }): Promise<PaymentSession>;
  expirePendingSessions(): Promise<number>;
  getStatsByOrgIds({
    orgIds,
  }: {
    orgIds: string[];
  }): Promise<PaymentStatusStats[]>;
  findByOrgIds({
    orgIds,
    options,
  }: {
    orgIds: string[];
    options?: { take?: number; orderBy?: "createdAt" };
  }): Promise<PaymentSessionWithOrg[]>;
  countPaidByOrgId({ orgId }: { orgId: string }): Promise<number>;
}
