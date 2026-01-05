/**
 * Base repository class providing common functionality
 */
export abstract class BaseRepository {
  constructor(protected readonly entityName: string) {}

  protected handleError({
    operation,
    error,
  }: {
    operation: string;
    error: unknown;
  }): never {
    console.error(`[${this.entityName}Repository] ${operation} error:`, error);
    throw error;
  }
}
