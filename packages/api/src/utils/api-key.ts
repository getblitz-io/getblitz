import { prisma } from "@getblitz/database";

export interface ApiKeyValidationResult {
  valid: boolean;
  organizationId?: string;
  keyId?: string;
  error?: string;
}

/**
 * Validate an API key and return the associated organization
 */
export async function validateApiKey(
  authHeader: string | null,
): Promise<ApiKeyValidationResult> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  const secretKey = await prisma.organizationSecretKey.findFirst({
    where: { secretKey: token },
    select: { id: true, organizationId: true },
  });

  if (!secretKey) {
    return { valid: false, error: "Invalid API key" };
  }

  // Update last used timestamp (fire and forget)
  prisma.organizationSecretKey
    .update({
      where: { id: secretKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(console.error);

  return {
    valid: true,
    organizationId: secretKey.organizationId,
    keyId: secretKey.id,
  };
}
