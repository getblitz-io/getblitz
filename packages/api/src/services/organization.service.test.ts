import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { BankConnectionStatus } from "@getblitz/database";

import type {
  AddBankAccountInput,
  IBankAccountRepository,
  IOrganizationBankConnectionRepository,
  IOrganizationRepository,
  IOrganizationWebhookRepository,
  IPaymentSessionRepository,
} from "../interfaces";
import { ForbiddenError, NotFoundError } from "../interfaces";
import { OrganizationService } from "./organization.service";

describe("OrganizationService", () => {
  let service: OrganizationService;
  const mockOrgRepo = {
    findById: vi.fn(),
    findMemberByUserAndOrg: vi.fn(),
  };
  const mockSessionRepo = {};
  const mockBankRepo = {
    upsert: vi.fn(),
    setDefault: vi.fn(),
  };
  const mockWebhookRepo = {};
  const mockConnRepo = {
    findById: vi.fn(),
  };

  beforeAll(() => {
    service = new OrganizationService(
      mockOrgRepo as unknown as IOrganizationRepository,
      mockSessionRepo as unknown as IPaymentSessionRepository,
      mockBankRepo as unknown as IBankAccountRepository,
      mockWebhookRepo as unknown as IOrganizationWebhookRepository,
      mockConnRepo as unknown as IOrganizationBankConnectionRepository,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get organization by ID if user is member", async () => {
    const org = { id: "org-1", name: "Test Org" };
    mockOrgRepo.findById.mockResolvedValue(org);
    mockOrgRepo.findMemberByUserAndOrg.mockResolvedValue({ userId: "user-1" });

    const result = await service.getById({ id: "org-1", userId: "user-1" });

    expect(result).toEqual(org);
    expect(mockOrgRepo.findById).toHaveBeenCalledWith({ id: "org-1" });
  });

  it("should throw ForbiddenError if user is not member", async () => {
    mockOrgRepo.findById.mockResolvedValue({ id: "org-1" });
    mockOrgRepo.findMemberByUserAndOrg.mockResolvedValue(null);

    await expect(
      service.getById({ id: "org-1", userId: "user-2" }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("should throw NotFoundError if organization not found", async () => {
    mockOrgRepo.findById.mockResolvedValue(null);

    await expect(
      service.getById({ id: "unknown", userId: "user-1" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("should add bank account if connection is connected", async () => {
    mockConnRepo.findById.mockResolvedValue({
      id: "conn-1",
      organizationId: "org-1",
      status: BankConnectionStatus.CONNECTED,
    });
    mockBankRepo.upsert.mockResolvedValue({ id: "bank-1" });

    const input: AddBankAccountInput = {
      organizationId: "org-1",
      connectionId: "conn-1",
      externalAccountId: "ext-1",
      accountName: "Main",
      accountIban: "FR123",
      accountBic: "BIC123",
      isDefault: true,
    };

    const result = await service.addBankAccount({ input });

    expect(result.id).toBe("bank-1");
    expect(mockBankRepo.setDefault).toHaveBeenCalled();
  });

  it("should throw error when adding bank account if connection belongs to different org", async () => {
    mockConnRepo.findById.mockResolvedValue({
      id: "conn-1",
      organizationId: "other-org",
      status: BankConnectionStatus.CONNECTED,
    });

    const input: AddBankAccountInput = {
      organizationId: "org-1",
      connectionId: "conn-1",
      externalAccountId: "ext-1",
      accountName: "Main",
      accountIban: "FR123",
      accountBic: "BIC123",
    };

    await expect(service.addBankAccount({ input })).rejects.toThrow(
      NotFoundError,
    );
  });

  it("should throw error when adding bank account if connection not connected", async () => {
    mockConnRepo.findById.mockResolvedValue({
      id: "conn-1",
      organizationId: "org-1",
      status: BankConnectionStatus.DISCONNECTED,
    });

    const input: AddBankAccountInput = {
      organizationId: "org-1",
      connectionId: "conn-1",
      externalAccountId: "ext-1",
      accountName: "Main",
      accountIban: "FR123",
      accountBic: "BIC123",
    };

    await expect(service.addBankAccount({ input })).rejects.toThrow(
      NotFoundError,
    );
  });
});
