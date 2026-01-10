import type { ApiKeyValidationResult } from "..";

export interface IApiKeyService {
  validate({
    authHeader,
  }: {
    authHeader: string | null;
  }): Promise<ApiKeyValidationResult>;
}
