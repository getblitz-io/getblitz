import type { SettlementInput, SettlementResult } from "..";

export interface IPaymentSettlementService {
  settle({ input }: { input: SettlementInput }): Promise<SettlementResult>;
}
