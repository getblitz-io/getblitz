export interface CreatePreviewTokenParams {
  resourceType: "invoice"; // extensibility for other types later
  resourceId: string;
  organizationId: string;
  userId: string; // The user who created the preview
  expiresInSeconds?: number;
}

export interface VerifyPreviewTokenResult {
  resourceType: string;
  resourceId: string;
  organizationId: string;
  userId: string;
  organization: {
    id: string;
  };
}

export interface VerifyPreviewTokenParams {
  previewToken: string;
  userId: string;
}

export interface IPreviewService {
  /**
   * Create a short-lived preview token for a resource
   */
  createPreviewToken(params: CreatePreviewTokenParams): Promise<string>;

  /**
   * Verify a preview token and return the context data
   */
  verifyPreviewToken(
    params: VerifyPreviewTokenParams,
  ): Promise<VerifyPreviewTokenResult | null>;
}
