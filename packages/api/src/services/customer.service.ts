import { TRPCError } from "@trpc/server";

import type { Customer, Prisma } from "@getblitz/database";

import type { ICustomerRepository } from "../interfaces/repositories/ICustomerRepository.interface";
import type {
  CreateCustomerInput,
  ICustomerService,
  UpdateCustomerInput,
} from "../interfaces/services/ICustomerService.interface";

export class CustomerService implements ICustomerService {
  constructor(private readonly customerRepo: ICustomerRepository) {}

  async createCustomer(
    input: CreateCustomerInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Customer> {
    return this.customerRepo.create(
      {
        organization: { connect: { id: input.organizationId } },
        email: input.email,
        name: input.name,
        address: input.address,
        taxId: input.taxId,
      },
      tx,
    );
  }

  async getCustomer(id: string): Promise<Customer | null> {
    return this.customerRepo.findById(id);
  }

  async listCustomers(
    organizationId: string,
    options?: { take?: number; skip?: number },
  ): Promise<Customer[]> {
    return this.customerRepo.findByOrganization(organizationId, options);
  }

  async updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
    const customer = await this.customerRepo.findById(input.id);

    if (!customer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Customer not found",
      });
    }

    if (customer.organizationId !== input.organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this customer",
      });
    }

    return this.customerRepo.update(input.id, {
      email: input.email,
      name: input.name,
      address: input.address,
      taxId: input.taxId,
    });
  }

  async deleteCustomer(id: string, organizationId: string): Promise<Customer> {
    const customer = await this.customerRepo.findById(id);

    if (!customer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Customer not found",
      });
    }

    if (customer.organizationId !== organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this customer",
      });
    }

    return this.customerRepo.delete(id);
  }

  async getOrCreateCustomer(
    input: CreateCustomerInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Customer> {
    const customer = await this.customerRepo.findByEmail(
      {
        organizationId: input.organizationId,
        email: input.email,
      },
      tx,
    );

    if (customer) {
      return customer;
    }

    return this.createCustomer(input, tx);
  }

  async searchCustomers(params: {
    organizationId: string;
    query: string;
    take?: number;
  }): Promise<Customer[]> {
    return this.customerRepo.search(params);
  }
}
