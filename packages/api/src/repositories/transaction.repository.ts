import type { PrismaClient, Transaction } from "@getblitz/database";

import type {
  CreateTransactionInput,
  ITransactionRepository,
} from "../interfaces";
import { BaseRepository } from "./base.repository";

export class TransactionRepository
  extends BaseRepository
  implements ITransactionRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super("Transaction");
  }

  async create({
    data,
  }: {
    data: CreateTransactionInput;
  }): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: {
        paymentSessionId: data.paymentSessionId,
        txHash: data.txHash,
        amountCents: data.amountCents,
        currency: data.currency,
        customerIban: data.customerIban,
        customerBic: data.customerBic,
        customerName: data.customerName,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rawPayload: data.rawPayload
          ? JSON.parse(JSON.stringify(data.rawPayload))
          : undefined,
      },
    });
  }

  async findBySessionId({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { paymentSessionId: sessionId },
      orderBy: { createdAt: "desc" },
    });
  }

  async sumAmountBySessionId({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<number> {
    const result: { _sum: { amountCents: number | null } } =
      await this.prisma.transaction.aggregate({
        where: {
          paymentSessionId: sessionId,
          status: "COMPLETED",
        },
        _sum: { amountCents: true },
      });
    return result._sum.amountCents ?? 0;
  }
}
