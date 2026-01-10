import type {
  CreateChallengeInput,
  CreateChallengeResult,
  PaymentSessionWithOrg,
  SessionDetailsResult,
  SimulatePaymentResult,
} from "..";

export interface IPaymentSessionService {
  createChallenge({
    input,
    baseUrl,
  }: {
    input: CreateChallengeInput;
    baseUrl: string;
  }): Promise<CreateChallengeResult>;
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
}
