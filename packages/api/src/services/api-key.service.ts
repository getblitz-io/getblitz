import type {
  ApiKeyValidationResult,
  IApiKeyRepository,
  IApiKeyService,
} from "../interfaces";

export class ApiKeyService implements IApiKeyService {
  constructor(private readonly apiKeyRepository: IApiKeyRepository) {}

  /**
   * Validate an API key and return the associated organization
   */
  async validate({
    authHeader,
  }: {
    authHeader: string | null;
  }): Promise<ApiKeyValidationResult> {
    if (!authHeader?.startsWith("Bearer ")) {
      return { valid: false, error: "Missing or invalid Authorization header" };
    }

    const token = authHeader.slice(7); // Remove "Bearer "

    const secretKey = await this.apiKeyRepository.findBySecretKey({
      secretKey: token,
    });

    if (!secretKey) {
      return { valid: false, error: "Invalid API key" };
    }

    // Update last used timestamp (fire and forget)
    this.apiKeyRepository.updateLastUsed({ id: secretKey.id });

    return {
      valid: true,
      organizationId: secretKey.organizationId,
      keyId: secretKey.id,
    };
  }
}
