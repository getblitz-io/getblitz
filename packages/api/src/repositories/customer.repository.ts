import type { Customer, Prisma, PrismaClient } from "@getblitz/database";

import type { ICustomerRepository } from "../interfaces/repositories/ICustomerRepository.interface";

export class CustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    data: Prisma.CustomerCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Customer> {
    return (tx ?? this.prisma).customer.create({
      data,
    });
  }

  async findById(id: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { id },
    });
  }

  async findByEmail(
    params: { email: string; organizationId: string },
    tx?: Prisma.TransactionClient,
  ): Promise<Customer | null> {
    const { email, organizationId } = params;
    return (tx ?? this.prisma).customer.findUnique({
      where: { email_organizationId: { email, organizationId } },
    });
  }

  async findByOrganization(
    organizationId: string,
    options?: { take?: number; skip?: number },
  ): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: options?.take,
      skip: options?.skip,
    });
  }

  async update(
    id: string,
    data: Prisma.CustomerUpdateInput,
  ): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Customer> {
    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async search({
    organizationId,
    query,
    take = 10,
  }: {
    organizationId: string;
    query: string;
    take?: number;
  }): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: {
        organizationId,
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      take,
      orderBy: { name: "asc" },
    });
  }
}
