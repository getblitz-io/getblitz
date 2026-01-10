import type { BankAccount } from "@getblitz/database";

import type {
  BankAccountWithOrganizationBankConnection,
  CreateBankAccountInput,
} from "..";

export interface IBankAccountRepository {
  findById({
    id,
  }: {
    id: string;
  }): Promise<BankAccountWithOrganizationBankConnection | null>;
  findByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<BankAccountWithOrganizationBankConnection[]>;
  findDefaultByOrganizationId({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<BankAccountWithOrganizationBankConnection | null>;
  upsert({
    data,
  }: {
    data: CreateBankAccountInput;
  }): Promise<BankAccountWithOrganizationBankConnection>;
  delete({ id }: { id: string }): Promise<BankAccount>;
  setDefault({
    organizationId,
    bankAccountId,
  }: {
    organizationId: string;
    bankAccountId: string;
  }): Promise<void>;
}
