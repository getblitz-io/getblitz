import { RateLimiterRedis } from "rate-limiter-flexible";

import type { Redis } from "@getblitz/redis";
import { getRedisClient } from "@getblitz/redis";

// Cached rate limiter instances, one per key prefix so that different
// limits (API vs. invoice password) never share or override each other
const rateLimiters = new Map<string, RateLimiterRedis>();

const DEFAULT_KEY_PREFIX = "getblitz:ratelimit";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimitConfig {
  keyPrefix: string;
  points: number;
  duration: number;
  blockDuration: number;
}

/**
 * Get or create a rate limiter instance
 * Uses the existing Redis connection for rate limiting
 */
export function getRateLimiter(
  config?: RateLimitConfig,
): RateLimiterRedis | null {
  const keyPrefix = config?.keyPrefix ?? DEFAULT_KEY_PREFIX;
  const cached = rateLimiters.get(keyPrefix);
  if (cached) return cached;

  let redis: Redis;
  try {
    redis = getRedisClient();
  } catch {
    // Redis not available, rate limiting disabled
    return null;
  }

  // Create rate limiter with sliding window algorithm
  // 100 requests per 60 seconds per key
  const rateLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix,
    points: config?.points ?? 100, // Number of requests
    duration: config?.duration ?? 60, // Per 60 seconds
    blockDuration: config?.blockDuration ?? 0, // Don't block, just reject
  });
  rateLimiters.set(keyPrefix, rateLimiter);

  return rateLimiter;
}

/**
 * Check rate limit for a given identifier (e.g., API key or org ID)
 */
export async function checkRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getRateLimiter();

  // If rate limiting is not configured, allow all requests
  if (!limiter) {
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
    };
  }

  try {
    const result = await limiter.consume(identifier);

    return {
      success: true,
      limit: 100,
      remaining: result.remainingPoints,
      reset: Date.now() + result.msBeforeNext,
    };
  } catch (error) {
    // Rate limit exceeded (RateLimiterRes is thrown when limit exceeded)
    if (
      error &&
      typeof error === "object" &&
      "remainingPoints" in error &&
      "msBeforeNext" in error
    ) {
      const rateLimitError = error as {
        remainingPoints: number;
        msBeforeNext: number;
      };
      return {
        success: false,
        limit: 100,
        remaining: rateLimitError.remainingPoints,
        reset: Date.now() + rateLimitError.msBeforeNext,
      };
    }

    // Unexpected error - fail open (allow request)
    console.error("Rate limit check error:", error);
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
    };
  }
}

/**
 * Create rate limit headers from result
 */
export function createRateLimitHeaders(result: RateLimitResult): HeadersInit {
  if (result.limit === Infinity) {
    return {};
  }

  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  };
}
