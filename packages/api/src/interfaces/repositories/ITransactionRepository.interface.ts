import type { Transaction } from "@getblitz/database";

import type { CreateTransactionInput } from "..";

export interface ITransactionRepository {
  create({ data }: { data: CreateTransactionInput }): Promise<Transaction>;
  findBySessionId({ sessionId }: { sessionId: string }): Promise<Transaction[]>;
}
