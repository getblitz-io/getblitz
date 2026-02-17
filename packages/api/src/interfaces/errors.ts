/**
 * Custom error classes for service layer
 */

export class ForbiddenError extends Error {
  override name = "ForbiddenError" as const;
}

export class NotFoundError extends Error {
  override name = "NotFoundError" as const;
}

export class ConflictError extends Error {
  override name = "ConflictError" as const;
}

export class TokenExpiredError extends Error {
  override name = "TokenExpiredError" as const;
  public readonly connectionId: string;

  constructor({
    connectionId,
    message,
  }: {
    connectionId: string;
    message?: string;
  }) {
    super(message ?? "Bank connection token expired and cannot be refreshed");
    this.connectionId = connectionId;
  }
}
