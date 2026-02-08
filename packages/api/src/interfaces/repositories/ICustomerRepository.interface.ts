import type { Customer, Prisma } from "@getblitz/database";

export interface ICustomerRepository {
  create(
    data: Prisma.CustomerCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findByOrganization(
    organizationId: string,
    options?: { take?: number; skip?: number },
  ): Promise<Customer[]>;
  findByEmail(
    params: { email: string; organizationId: string },
    tx?: Prisma.TransactionClient,
  ): Promise<Customer | null>;
  update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer>;
  delete(id: string): Promise<Customer>;
  search(params: {
    organizationId: string;
    query: string;
    take?: number;
  }): Promise<Customer[]>;
}
