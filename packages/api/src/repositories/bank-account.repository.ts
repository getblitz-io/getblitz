import type { BankAccount, PrismaClient } from "@getblitz/database";

import type {
  BankAccountWithOrganizationBankConnection,
  CreateBankAccountInput,
  IBankAccountRepository,
} from "../interfaces";
import { BaseRepository } from "./base.repository";

export class BankAccountRepository
  extends BaseRepository
  implements IBankAccountRepository
{
  constructor(private readonly prisma: PrismaClient) {
    super("BankAccount");
  }

  async findById({
    id,
  }: {
    id: string;
  }): Promise<BankAccountWithOrganizationBankConnection | null> {
    return this.prisma.bankAccount.findUnique({
      where: { id },
      include: {
        organizationBankConnection: true,
      },
    });
  }

  async findByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<BankAccountWithOrganizationBankConnection[]> {
    return this.prisma.bankAccount.findMany({
      where: { organizationBankConnection: { organizationId } },
      include: {
        organizationBankConnection: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findDefaultByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<BankAccountWithOrganizationBankConnection | null> {
    return this.prisma.bankAccount.findFirst({
      where: {
        organizationBankConnection: { organizationId },
        isDefault: true,
      },
      include: {
        organizationBankConnection: true,
      },
    });
  }

  async create({
    data,
  }: {
    data: CreateBankAccountInput;
  }): Promise<BankAccountWithOrganizationBankConnection> {
    return this.prisma.bankAccount.create({
      data: {
        organizationBankConnection: {
          connect: { id: data.organizationBankConnectionId },
        },
        accountName: data.accountName,
        accountIban: data.accountIban,
        accountBic: data.accountBic,
        accountConfig: JSON.stringify({}),
      },
      include: {
        organizationBankConnection: true,
      },
    });
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<CreateBankAccountInput>;
  }): Promise<BankAccountWithOrganizationBankConnection> {
    return this.prisma.bankAccount.update({
      where: { id },
      data,
      include: {
        organizationBankConnection: true,
      },
    });
  }

  async delete({ id }: { id: string }): Promise<BankAccount> {
    return this.prisma.bankAccount.delete({
      where: { id },
    });
  }

  async setDefault({
    organizationId,
    bankAccountId,
  }: {
    organizationId: string;
    bankAccountId: string;
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.bankAccount.updateMany({
        where: { organizationBankConnection: { organizationId } },
        data: { isDefault: false },
      }),
      this.prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { isDefault: true },
      }),
    ]);
  }
}
