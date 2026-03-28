import type { Prisma } from "@getblitz/database";

import type {
  CreateChallengeInput,
  CreateChallengeResult,
  PaymentSessionWithOrg,
  QrCodeResult,
  SessionDetailsResult,
  SimulatePaymentResult,
} from "..";

export interface IPaymentSessionService {
  createChallenge(
    {
      input,
      baseUrl,
    }: {
      input: CreateChallengeInput;
      baseUrl: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<CreateChallengeResult>;
  getSessionDetails({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<SessionDetailsResult | null>;
  getSessionDetailsByReference({
    referenceId,
  }: {
    referenceId: string;
  }): Promise<SessionDetailsResult | null>;
  simulatePayment({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<SimulatePaymentResult>;
  expireSessions(): Promise<number>;
  listByOrgIds({
    orgIds,
    options,
  }: {
    orgIds: string[];
    options?: { take?: number };
  }): Promise<PaymentSessionWithOrg[]>;
  getQrCodeBase64({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<QrCodeResult | null>;
  getQrCodeBuffer({ sessionId }: { sessionId: string }): Promise<Buffer | null>;
  verifySessionAccess({
    sessionId,
    clientToken,
    origin,
  }: {
    sessionId: string;
    clientToken: string;
    origin: string;
  }): Promise<void>;
}
