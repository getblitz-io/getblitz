import type { Job } from "@getblitz/queue";
import { BankConnectionStatus } from "@getblitz/database";
import { createWorker } from "@getblitz/queue";

import type { CheckTokenHealthJobPayload } from "./check-token-health.queue";
import { getContainer } from "../container";
import { cronLogger } from "../utils";
import {
  CHECK_TOKEN_HEALTH_QUEUE_NAME,
  registerCheckTokenHealthJob,
} from "./check-token-health.queue";

/**
 * Initialize the token health check worker
 * This should be called from the instrumentation hook
 */
export function initCheckTokenHealthWorker(): void {
  createWorker<CheckTokenHealthJobPayload>(
    CHECK_TOKEN_HEALTH_QUEUE_NAME,
    async (_job: Job<CheckTokenHealthJobPayload>) => {
      const container = getContainer();
      const { prisma, credentialManagerService } = container;

      try {
        // Query all CONNECTED bank connections that use OAuth2
        // We filter by provider type in the application logic as we iterate
        const connections = await prisma.organizationBankConnection.findMany({
          where: {
            status: BankConnectionStatus.CONNECTED,
            // Optimization: we could filter by providerId if we knew which ones are OAuth2
            // but for now we'll check them all and the credential manager will handle it
          },
          select: {
            id: true,
            providerId: true,
            providerConfig: true,
          },
        });

        let healthyCount = 0;
        let needsReauthCount = 0;
        let diffCount = 0;

        for (const connection of connections) {
          try {
            const { healthy, needsReauth } =
              await credentialManagerService.checkTokenHealth({
                connectionId: connection.id,
              });

            if (healthy) healthyCount++;
            if (needsReauth) needsReauthCount++;
            if (!healthy && !needsReauth) diffCount++; // Unhealthy but not needing reauth (e.g. error)
          } catch (error) {
            cronLogger.error(
              `Error checking token health for connection ${connection.id}`,
              {
                error: String(error),
                connectionId: connection.id,
              },
            );
          }
        }

        const now = new Date();
        cronLogger.info("Checked bank connection token health", {
          total: connections.length,
          healthy: healthyCount,
          needsReauth: needsReauthCount,
          other: diffCount,
          timestamp: now.toISOString(),
        });
      } catch (error) {
        cronLogger.error("Error in token health check job", {
          error: String(error),
        });
        throw error;
      }
    },
    {
      concurrency: 1, // Only one instance should run at a time
    },
  );

  // Register the repeatable job
  void registerCheckTokenHealthJob();

  cronLogger.info(`Worker '${CHECK_TOKEN_HEALTH_QUEUE_NAME}' initialized`);
}
