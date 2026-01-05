import type { BankCredentials } from "@getblitz/bank-providers";
import type { Redis } from "@getblitz/redis";
import { getRedisClient } from "@getblitz/redis";

export class CredentialCacheService {
  private redis: Redis;
  private readonly PREFIX = "bank-cred:";

  constructor(redis?: Redis) {
    this.redis = redis ?? getRedisClient();
  }

  async storeCredentials({
    sessionId,
    credentials,
    ttlSeconds,
  }: {
    sessionId: string;
    credentials: BankCredentials;
    ttlSeconds: number;
  }): Promise<void> {
    const key = `${this.PREFIX}${sessionId}`;
    await this.redis.set(key, JSON.stringify(credentials), "EX", ttlSeconds);
  }

  async getCredentials({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<BankCredentials | null> {
    const key = `${this.PREFIX}${sessionId}`;
    const data = await this.redis.get(key);

    if (!data) return null;
    try {
      if (typeof data === "string") {
        return JSON.parse(data) as BankCredentials;
      }
      return data as BankCredentials;
    } catch {
      return null;
    }
  }

  async deleteCredentials({ sessionId }: { sessionId: string }): Promise<void> {
    const key = `${this.PREFIX}${sessionId}`;
    await this.redis.del(key);
  }
}
