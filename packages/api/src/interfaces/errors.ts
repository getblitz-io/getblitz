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
