import type { Customer, Prisma } from "@getblitz/database";

export interface CreateCustomerInput {
  organizationId: string;
  email: string;
  name?: string;
  address?: string;
  taxId?: string;
}

export interface UpdateCustomerInput {
  id: string;
  organizationId: string; // For authorization check
  email?: string;
  name?: string;
  address?: string;
  taxId?: string;
}

export interface ICustomerService {
  createCustomer(
    input: CreateCustomerInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Customer>;
  getOrCreateCustomer(
    input: CreateCustomerInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Customer>;
  getCustomer(id: string): Promise<Customer | null>;
  listCustomers(
    organizationId: string,
    options?: { take?: number; skip?: number },
  ): Promise<Customer[]>;
  updateCustomer(input: UpdateCustomerInput): Promise<Customer>;
  deleteCustomer(id: string, organizationId: string): Promise<Customer>;
}
