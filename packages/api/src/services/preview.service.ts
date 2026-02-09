import crypto from "crypto";

import type { Redis } from "@getblitz/redis";

import type {
  CreatePreviewTokenParams,
  IPreviewService,
  VerifyPreviewTokenParams,
  VerifyPreviewTokenResult,
} from "../interfaces/services/IPreviewService.interface";

export class PreviewService implements IPreviewService {
  private readonly DEFAULT_EXPIRATION = 3600; // 1 hour

  constructor(private readonly redis: Redis) {}

  async createPreviewToken(params: CreatePreviewTokenParams): Promise<string> {
    const token = crypto.randomUUID();
    const key = this.getRedisKey(token);

    const data = {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      organizationId: params.organizationId,
      userId: params.userId,
    };

    await this.redis.set(
      key,
      JSON.stringify(data),
      "EX",
      params.expiresInSeconds ?? this.DEFAULT_EXPIRATION,
    );

    return token;
  }

  async verifyPreviewToken({
    previewToken,
    userId,
  }: VerifyPreviewTokenParams): Promise<VerifyPreviewTokenResult | null> {
    const key = this.getRedisKey(previewToken);
    const dataString = await this.redis.get(key);

    if (!dataString) {
      return null;
    }

    try {
      const data = JSON.parse(dataString) as {
        resourceType: string;
        resourceId: string;
        organizationId: string;
        userId: string;
      };

      if (data.userId !== userId) {
        return null;
      }

      return {
        ...data,
        organization: { id: data.organizationId }, // Helper for organization context
      };
    } catch {
      return null;
    }
  }

  private getRedisKey(token: string): string {
    return `preview:${token}`;
  }
}
