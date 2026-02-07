import { TRPCError } from "@trpc/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Customer } from "@getblitz/database";

import type { ICustomerRepository } from "../interfaces/repositories/ICustomerRepository.interface";
import type { CreateCustomerInput } from "../interfaces/services/ICustomerService.interface";
import { CustomerService } from "./customer.service";

describe("CustomerService", () => {
  let service: CustomerService;

  const mockCustomerRepo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByOrganization: vi.fn(),
    findByEmail: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockCustomer: Customer = {
    id: "cust-1",
    organizationId: "org-1",
    email: "test@example.com",
    name: "Test Customer",
    address: "123 Main St",
    taxId: "TAX123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(() => {
    service = new CustomerService(
      mockCustomerRepo as unknown as ICustomerRepository,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCustomer", () => {
    it("should create a customer successfully", async () => {
      const input: CreateCustomerInput = {
        organizationId: "org-1",
        email: "test@example.com",
        name: "Test Customer",
        address: "123 Main St",
        taxId: "TAX123",
      };

      mockCustomerRepo.create.mockResolvedValue(mockCustomer);

      const result = await service.createCustomer(input);

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerRepo.create).toHaveBeenCalledWith(
        {
          organization: { connect: { id: "org-1" } },
          email: "test@example.com",
          name: "Test Customer",
          address: "123 Main St",
          taxId: "TAX123",
        },
        undefined,
      );
    });

    it("should pass transaction client when provided", async () => {
      const input: CreateCustomerInput = {
        organizationId: "org-1",
        email: "test@example.com",
      };
      const mockTx = {} as never;

      mockCustomerRepo.create.mockResolvedValue(mockCustomer);

      await service.createCustomer(input, mockTx);

      expect(mockCustomerRepo.create).toHaveBeenCalledWith(
        expect.anything(),
        mockTx,
      );
    });
  });

  describe("getCustomer", () => {
    it("should return customer when found", async () => {
      mockCustomerRepo.findById.mockResolvedValue(mockCustomer);

      const result = await service.getCustomer("cust-1");

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerRepo.findById).toHaveBeenCalledWith("cust-1");
    });

    it("should return null when customer not found", async () => {
      mockCustomerRepo.findById.mockResolvedValue(null);

      const result = await service.getCustomer("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("listCustomers", () => {
    it("should list customers for organization", async () => {
      const customers = [mockCustomer];
      mockCustomerRepo.findByOrganization.mockResolvedValue(customers);

      const result = await service.listCustomers("org-1");

      expect(result).toEqual(customers);
      expect(mockCustomerRepo.findByOrganization).toHaveBeenCalledWith(
        "org-1",
        undefined,
      );
    });

    it("should pass pagination options", async () => {
      mockCustomerRepo.findByOrganization.mockResolvedValue([]);

      await service.listCustomers("org-1", { take: 10, skip: 5 });

      expect(mockCustomerRepo.findByOrganization).toHaveBeenCalledWith(
        "org-1",
        { take: 10, skip: 5 },
      );
    });
  });

  describe("updateCustomer", () => {
    it("should update customer successfully", async () => {
      const updatedCustomer = { ...mockCustomer, name: "Updated Name" };
      mockCustomerRepo.findById.mockResolvedValue(mockCustomer);
      mockCustomerRepo.update.mockResolvedValue(updatedCustomer);

      const result = await service.updateCustomer({
        id: "cust-1",
        organizationId: "org-1",
        name: "Updated Name",
      });

      expect(result).toEqual(updatedCustomer);
      expect(mockCustomerRepo.update).toHaveBeenCalledWith("cust-1", {
        email: undefined,
        name: "Updated Name",
        address: undefined,
        taxId: undefined,
      });
    });

    it("should throw NOT_FOUND when customer does not exist", async () => {
      mockCustomerRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateCustomer({
          id: "non-existent",
          organizationId: "org-1",
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.updateCustomer({
          id: "non-existent",
          organizationId: "org-1",
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw FORBIDDEN when organization does not match", async () => {
      mockCustomerRepo.findById.mockResolvedValue(mockCustomer);

      await expect(
        service.updateCustomer({
          id: "cust-1",
          organizationId: "different-org",
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.updateCustomer({
          id: "cust-1",
          organizationId: "different-org",
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("deleteCustomer", () => {
    it("should delete customer successfully", async () => {
      mockCustomerRepo.findById.mockResolvedValue(mockCustomer);
      mockCustomerRepo.delete.mockResolvedValue(mockCustomer);

      const result = await service.deleteCustomer("cust-1", "org-1");

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerRepo.delete).toHaveBeenCalledWith("cust-1");
    });

    it("should throw NOT_FOUND when customer does not exist", async () => {
      mockCustomerRepo.findById.mockResolvedValue(null);

      await expect(
        service.deleteCustomer("non-existent", "org-1"),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.deleteCustomer("non-existent", "org-1"),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("should throw FORBIDDEN when organization does not match", async () => {
      mockCustomerRepo.findById.mockResolvedValue(mockCustomer);

      await expect(
        service.deleteCustomer("cust-1", "different-org"),
      ).rejects.toThrow(TRPCError);

      await expect(
        service.deleteCustomer("cust-1", "different-org"),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("getOrCreateCustomer", () => {
    it("should return existing customer when found", async () => {
      mockCustomerRepo.findByEmail.mockResolvedValue(mockCustomer);

      const input: CreateCustomerInput = {
        organizationId: "org-1",
        email: "test@example.com",
      };

      const result = await service.getOrCreateCustomer(input);

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerRepo.findByEmail).toHaveBeenCalledWith(
        { organizationId: "org-1", email: "test@example.com" },
        undefined,
      );
      expect(mockCustomerRepo.create).not.toHaveBeenCalled();
    });

    it("should create customer when not found", async () => {
      mockCustomerRepo.findByEmail.mockResolvedValue(null);
      mockCustomerRepo.create.mockResolvedValue(mockCustomer);

      const input: CreateCustomerInput = {
        organizationId: "org-1",
        email: "new@example.com",
      };

      const result = await service.getOrCreateCustomer(input);

      expect(result).toEqual(mockCustomer);
      expect(mockCustomerRepo.create).toHaveBeenCalled();
    });

    it("should pass transaction client to both findByEmail and create", async () => {
      const mockTx = {} as never;
      mockCustomerRepo.findByEmail.mockResolvedValue(null);
      mockCustomerRepo.create.mockResolvedValue(mockCustomer);

      await service.getOrCreateCustomer(
        { organizationId: "org-1", email: "new@example.com" },
        mockTx,
      );

      expect(mockCustomerRepo.findByEmail).toHaveBeenCalledWith(
        expect.anything(),
        mockTx,
      );
      expect(mockCustomerRepo.create).toHaveBeenCalledWith(
        expect.anything(),
        mockTx,
      );
    });
  });
});
