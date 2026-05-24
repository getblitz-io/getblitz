import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type {
  BankCredentials,
  BankProvider,
  ProviderConfig,
  ProviderConfigSchema,
} from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";
import { BankConnectionStatus } from "@getblitz/database";

import type { BankConnectionWithProvider } from "../interfaces";
import { env } from "../env";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TokenExpiredError,
} from "../interfaces";
import {
  createTRPCRouter,
  organizationProcedure,
  protectedProcedure,
} from "../trpc";

async function runPreSaveConfigHook({
  provider,
  config,
  credentials,
}: {
  provider: BankProvider;
  config: ProviderConfig;
  credentials: BankCredentials | null;
}): Promise<void> {
  try {
    await provider.preSaveConfigHook({ config, credentials });
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        error instanceof Error
          ? error.message
          : "Invalid provider configuration",
    });
  }
}

/**
 * Post-save hooks run after config is persisted. Failures must not roll back the
 * save or fail the request — hooks are best-effort side effects only.
 */
async function runPostSaveConfigHook({
  provider,
  connectionId,
  config,
  credentials,
}: {
  provider: BankProvider;
  connectionId: string;
  config: ProviderConfig;
  credentials: BankCredentials | null;
}): Promise<void> {
  try {
    await provider.postSaveConfigHook({ connectionId, config, credentials });
  } catch {
    // Intentionally swallowed: post-save hooks must not throw to callers.
  }
}

function assertDerivedCredentialsForNoOAuthProvider({
  provider,
  derivedCredentials,
}: {
  provider: BankProvider;
  derivedCredentials: BankCredentials | null;
}): void {
  if (provider.oauthFlowType === "none" && derivedCredentials === null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Provider configuration is incomplete (could not derive credentials for this provider)",
    });
  }
}

/**
 * Helper to convert service errors to TRPC errors
 */
function handleServiceError(error: unknown): never {
  if (error instanceof NotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: error.message });
  }
  if (error instanceof ForbiddenError) {
    throw new TRPCError({ code: "FORBIDDEN", message: error.message });
  }
  if (error instanceof ConflictError) {
    throw new TRPCError({ code: "CONFLICT", message: error.message });
  }
  if (error instanceof TokenExpiredError) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: error.message,
      cause: { connectionId: error.connectionId, code: "TOKEN_EXPIRED" },
    });
  }
  throw error;
}

export const organizationRouter = createTRPCRouter({
  // Get organization with details by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        return await ctx.services.organization.getById({
          id: input.id,
          userId: ctx.session.user.id,
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  // Get organization with details by slug
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        return await ctx.services.organization.getBySlug({
          slug: input.slug,
          userId: ctx.session.user.id,
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  // Update organization
  update: organizationProcedure
    .input(
      z.object({
        allowedOrigins: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.services.organization.update({
          organizationId: ctx.organization.id,
          userId: ctx.session.user.id,
          data: {
            allowedOrigins: input.allowedOrigins,
          },
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  // Get API keys for an organization
  getApiKeys: organizationProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.prisma.apikey.findMany({
        where: { referenceId: ctx.organization.id },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      handleServiceError(error);
    }
  }),

  // Generate new API key
  generateApiKey: organizationProcedure
    .input(z.object({ name: z.string().min(1, "Name is required") }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.auth.api.createApiKey({
          body: {
            name: input.name,
            organizationId: ctx.organization.id,
            configId: "org-keys",
          },
          headers: ctx.headers,
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  // Delete API key
  deleteApiKey: organizationProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const apiKey = await ctx.prisma.apikey.findUnique({
          where: { id: input.keyId },
        });

        if (apiKey?.referenceId !== ctx.organization.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "API key not found",
          });
        }

        return await ctx.auth.api.deleteApiKey({
          body: {
            keyId: input.keyId,
            configId: "org-keys",
          },
          headers: ctx.headers,
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  // Get provider configuration schema (for dynamic form generation)
  getProviderConfigSchema: organizationProcedure
    .input(
      z.object({
        providerId: z.string(),
        connectionId: z.string().optional(),
      }),
    )
    .query(
      async ({
        input,
        ctx,
      }): Promise<{
        schema: ProviderConfigSchema;
        defaultConfig: ProviderConfig;
        setupGuideUrl: string | null;
        fieldNamesBeforeCustomStep: string[];
      }> => {
        const provider = ProviderRegistry.getProvider(input.providerId);
        if (!provider) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid provider",
          });
        }

        let defaultConfig: ProviderConfig = provider.getDefaultConfig();
        // If connectionId is provided, load existing config
        if (input.connectionId) {
          const connection =
            await ctx.prisma.organizationBankConnection.findUnique({
              where: {
                id: input.connectionId,
                organizationId: ctx.organization.id,
              },
            });

          if (!connection) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Connection not found",
            });
          }
          // Only decrypt if providerConfig exists (might be null for PENDING_CONFIG)
          if (connection.providerConfig) {
            defaultConfig =
              ctx.services.credentialManager.decryptProviderConfig(
                connection.providerConfig,
              );
          }
        }

        return {
          schema: provider.getProviderConfigSchema(),
          defaultConfig,
          setupGuideUrl: provider.getSetupGuide(),
          fieldNamesBeforeCustomStep: provider.getFieldNamesBeforeCustomStep(),
        };
      },
    ),

  // Update an existing bank connection's config (for reconfiguring)
  updateBankConnectionConfig: organizationProcedure
    .input(
      z.object({
        connectionId: z.string(),
        providerConfig: z.record(z.string(), z.unknown()),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await ctx.prisma.organizationBankConnection.findFirst({
        where: {
          id: input.connectionId,
          organizationId: ctx.organization.id,
        },
      });

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      const providerTemplate = ProviderRegistry.getProvider(
        connection.providerId,
      );
      if (!providerTemplate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown bank provider",
        });
      }

      // Merge with existing config so hidden fields (e.g. Wise profileId) survive
      // reconfigure when the generic form omits them.
      let parsedConfig: ProviderConfig = input.providerConfig;
      if (connection.providerConfig) {
        const existing = ctx.services.credentialManager.decryptProviderConfig(
          connection.providerConfig,
        );
        parsedConfig = {
          ...existing,
          ...input.providerConfig,
        };
      }

      const derivedCredentials =
        providerTemplate.getCredentialsFromSavedConfig(parsedConfig);

      assertDerivedCredentialsForNoOAuthProvider({
        provider: providerTemplate,
        derivedCredentials,
      });

      await runPreSaveConfigHook({
        provider: providerTemplate,
        config: parsedConfig,
        credentials: derivedCredentials,
      });

      const encryptedConfig =
        ctx.services.credentialManager.encryptProviderConfig(parsedConfig);

      await ctx.prisma.organizationBankConnection.update({
        where: { id: connection.id },
        data: {
          providerConfig: encryptedConfig,
          ...(input.name !== undefined && { name: input.name }),
          ...(derivedCredentials !== null && {
            credentials:
              ctx.services.credentialManager.encryptCredentials(
                derivedCredentials,
              ),
          }),
        },
      });

      await runPostSaveConfigHook({
        provider: providerTemplate,
        connectionId: connection.id,
        config: parsedConfig,
        credentials: derivedCredentials,
      });

      if (derivedCredentials !== null && !connection.webhookUrl) {
        await ctx.services.bankConnection.setupWebhook({
          connectionId: connection.id,
        });
      }

      return { connectionId: connection.id };
    }),

  // Setup or retry webhook for an existing bank connection
  setupBankConnectionWebhook: organizationProcedure
    .input(
      z.object({
        slug: z.string(),
        connectionId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await ctx.prisma.organizationBankConnection.findUnique(
        {
          where: { id: input.connectionId },
        },
      );
      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank connection not found",
        });
      }

      // Verify connection belongs to the organization
      if (connection.organizationId !== ctx.organization.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const result = await ctx.services.bankConnection.setupWebhook({
        connectionId: input.connectionId,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Webhook creation failed",
        });
      }

      return { success: true };
    }),

  // Get accounts from provider (using connectionId)
  getProviderAccounts: organizationProcedure
    .input(
      z.object({
        connectionId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const connection = await ctx.prisma.organizationBankConnection.findFirst({
        where: {
          id: input.connectionId,
          organizationId: ctx.organization.id,
        },
      });
      if (!connection) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization bank connection not found",
        });
      }

      if (!connection.providerConfig) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connection is not fully configured",
        });
      }

      try {
        // Create an authenticated provider instance (needs credentials for API calls)
        const provider =
          await ctx.services.credentialManager.createAuthenticatedProvider({
            connectionId: connection.id,
          });

        return await provider.listAccounts();
      } catch (error: unknown) {
        if (error instanceof TokenExpiredError) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: error.message,
            cause: { connectionId: error.connectionId, code: "TOKEN_EXPIRED" },
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),

  // Get all available providers with connection status for an organization
  getAvailableProviders: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Get all registered providers from the registry
      const allProviders = ProviderRegistry.getAllProviderMetadata();

      // Get existing connections for this organization
      const existingConnections =
        await ctx.prisma.organizationBankConnection.findMany({
          where: { organizationId: input.orgId },
          select: {
            id: true,
            providerId: true,
            webhookUrl: true,
            webhookSecret: true,
          },
        });

      // Map to connection status format
      return allProviders.map((provider) => {
        const connection = existingConnections.find(
          (c) => c.providerId === provider.id,
        );
        return {
          id: provider.id,
          name: provider.displayName,
          providerId: provider.id,
          domain: provider.domain,
          authType: provider.authType,
          isConnected: !!connection,
          connectionId: connection?.id ?? null,
          webhookUrl: connection?.webhookUrl ?? null,
          webhookSecret: connection?.webhookSecret ?? null,
        };
      });
    }),

  // Get all bank connections for an organization with provider metadata
  getBankConnections: organizationProcedure.query(
    async ({ ctx }): Promise<BankConnectionWithProvider[]> => {
      // Get all connections for this organization
      const connections = await ctx.prisma.organizationBankConnection.findMany({
        where: { organizationId: ctx.organization.id },
        orderBy: { createdAt: "desc" },
      });

      // Map to BankConnectionWithProvider format with provider metadata
      return connections.map((connection): BankConnectionWithProvider => {
        const provider = ProviderRegistry.getProvider(connection.providerId);
        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Provider not found",
          });
        }
        const callbackUrl =
          connection.callbackUrl ??
          `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/bank-connection/${connection.id}`;

        return {
          id: connection.id,
          name: connection.name,
          connectionId: connection.id,
          providerId: connection.providerId,
          hasCredentials: !!connection.credentials,
          status: connection.status,
          webhookUrl: connection.webhookUrl,
          webhookSecret: connection.webhookSecret,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          providerName: provider.displayName,
          providerDomain: provider.domain,
          providerAuthType: provider.authType,
          providerOAuthFlowType: provider.oauthFlowType,
          callbackUrl,
          providerSetupGuideUrl: provider.getSetupGuide(),
        };
      });
    },
  ),

  getBankConnectionById: organizationProcedure
    .input(z.object({ connectionId: z.string() }))
    .query(async ({ ctx, input }): Promise<BankConnectionWithProvider> => {
      // Get all connections for this organization
      const connection = await ctx.prisma.organizationBankConnection.findFirst({
        where: { id: input.connectionId, organizationId: ctx.organization.id },
      });

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      const provider = ProviderRegistry.getProvider(connection.providerId);
      if (!provider) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider not found",
        });
      }

      return {
        id: connection.id,
        name: connection.name,
        connectionId: connection.id,
        providerId: connection.providerId,
        hasCredentials: !!connection.credentials,
        status: connection.status,
        webhookUrl: connection.webhookUrl,
        webhookSecret: connection.webhookSecret,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
        providerName: provider.displayName,
        providerDomain: provider.domain,
        providerAuthType: provider.authType,
        callbackUrl:
          connection.callbackUrl ??
          `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/bank-connection/${connection.id}`,
        providerOAuthFlowType: provider.oauthFlowType,
        providerSetupGuideUrl: provider.getSetupGuide(),
      };
    }),

  // Disconnect a bank from organization
  disconnectBank: organizationProcedure
    .input(
      z.object({
        connectionId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await ctx.prisma.organizationBankConnection.findUnique(
        {
          where: {
            id: input.connectionId,
            organizationId: ctx.organization.id,
          },
        },
      );

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank connection not found",
        });
      }

      await ctx.prisma.organizationBankConnection.delete({
        where: { id: input.connectionId },
      });

      return { success: true };
    }),

  // Update connection name
  updateConnectionName: organizationProcedure
    .input(
      z.object({
        slug: z.string(),
        connectionId: z.string(),
        name: z.string().max(255).nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await ctx.prisma.organizationBankConnection.findUnique(
        {
          where: {
            id: input.connectionId,
            organizationId: ctx.organization.id,
          },
        },
      );

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bank connection not found",
        });
      }

      await ctx.prisma.organizationBankConnection.update({
        where: { id: input.connectionId, organizationId: ctx.organization.id },
        data: {
          name: input.name ?? null,
        },
      });

      return { success: true };
    }),

  // Add bank account configuration (New)
  addBankAccount: organizationProcedure
    .input(
      z.object({
        connectionId: z.string(),
        externalAccountId: z.string().min(1, "External account ID is required"),
        accountName: z.string().min(1, "Account name is required"),
        accountIban: z.string().min(1, "Account IBAN is required"),
        accountBic: z.string().min(1, "Account BIC is required"),
        isDefault: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.services.organization.addBankAccount({
          input: {
            organizationId: ctx.organization.id,
            connectionId: input.connectionId,
            externalAccountId: input.externalAccountId,
            accountName: input.accountName,
            accountIban: input.accountIban,
            accountBic: input.accountBic,
            isDefault: input.isDefault,
          },
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  // Delete bank account
  deleteBankAccount: organizationProcedure
    .input(z.object({ bankAccountId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.services.organization.deleteBankAccount({
          bankAccountId: input.bankAccountId,
          userId: ctx.session.user.id,
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  // Set default bank account
  setDefaultBankAccount: organizationProcedure
    .input(z.object({ bankAccountId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await ctx.services.organization.setDefaultBankAccount({
          bankAccountId: input.bankAccountId,
          userId: ctx.session.user.id,
        });
        return { success: true };
      } catch (error) {
        handleServiceError(error);
      }
    }),

  // Create a new webhook
  createWebhook: organizationProcedure
    .input(
      z.object({
        webhookUrl: z.url("Invalid URL"),
        webhookSecret: z
          .string()
          .min(16, "Secret should be at least 16 characters"),
        notifyPaymentSuccess: z.boolean().default(true),
        notifyPaymentFailed: z.boolean().default(true),
        notifyPaymentExpired: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.services.organization.createWebhook({
          input: {
            ...input,
            organizationId: ctx.organization.id,
          },
          userId: ctx.session.user.id,
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  // Update an existing webhook
  updateWebhook: organizationProcedure
    .input(
      z.object({
        webhookId: z.string(),
        name: z.string().min(1).max(255).optional(),
        webhookUrl: z.string().url("Invalid URL").optional(),
        webhookSecret: z
          .string()
          .min(16, "Secret should be at least 16 characters")
          .optional(),
        notifyPaymentSuccess: z.boolean().optional(),
        notifyPaymentFailed: z.boolean().optional(),
        notifyPaymentExpired: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.services.organization.updateWebhook({
          input,
          userId: ctx.session.user.id,
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  // Delete a webhook
  deleteWebhook: organizationProcedure
    .input(z.object({ webhookId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.services.organization.deleteWebhook({
          webhookId: input.webhookId,
          userId: ctx.session.user.id,
        });
      } catch (error) {
        handleServiceError(error);
      }
    }),

  // Get paid count for a specific organization
  getPaidCount: organizationProcedure.query(async ({ ctx }) => {
    try {
      return ctx.services.organization.getPaidCount({
        orgId: ctx.organization.id,
      });
    } catch (error) {
      handleServiceError(error);
    }
  }),

  // ============================================================================
  // OAUTH FLOW ROUTES (using database for state management)
  // ============================================================================

  /**
   * Step 1: Initialize a bank connection
   * Creates a DB record with PENDING_CONFIG status and unique callback URL
   */
  initBankConnection: organizationProcedure
    .input(
      z.object({
        providerId: z.string(),
        connectionName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const provider = ProviderRegistry.getProvider(input.providerId);
      if (!provider) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Unknown provider: ${input.providerId}`,
        });
      }

      // Generate unique callback ID
      const connectionCallbackId = randomBytes(16).toString("hex");
      const callbackUrl = `${env.NEXT_PUBLIC_APP_URL}/${ctx.organization.slug}/banks/callback/${connectionCallbackId}`;

      // Create pending bank connection in database
      const connection = await ctx.prisma.organizationBankConnection.create({
        data: {
          organizationId: ctx.organization.id,
          providerId: input.providerId,
          callbackId: connectionCallbackId,
          callbackUrl,
          name: input.connectionName ?? null,
          status: BankConnectionStatus.PENDING_CONFIG,
          // providerConfig is null until step 2 (saveBankConfig)
        },
      });

      return {
        name: connection.name,
        connectionId: connection.id,
        callbackUrl,
        oauthFlowType: provider.oauthFlowType,
        setupGuideUrl: provider.getSetupGuide(),
      };
    }),

  /**
   * Step 2: Save provider configuration for a pending connection
   */
  saveBankConfig: organizationProcedure
    .input(
      z.object({
        connectionId: z.string(),
        providerConfig: z.record(z.string(), z.unknown()),
        connectionName: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Find the pending connection
      const connection = await ctx.prisma.organizationBankConnection.findUnique(
        {
          where: {
            id: input.connectionId,
            organizationId: ctx.organization.id,
          },
        },
      );

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pending connection not found",
        });
      }

      // Verify the connection is in pending state
      if (
        connection.status !== BankConnectionStatus.PENDING_CONFIG &&
        connection.status !== BankConnectionStatus.PENDING_OAUTH
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connection is not in a pending state",
        });
      }

      // Encrypt provider config
      const encryptedConfig =
        ctx.services.credentialManager.encryptProviderConfig(
          input.providerConfig,
        );

      const providerTemplate = ProviderRegistry.getProvider(
        connection.providerId,
      );
      if (!providerTemplate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown bank provider",
        });
      }

      const parsedConfig = input.providerConfig as ProviderConfig;
      const derivedCredentials =
        providerTemplate.getCredentialsFromSavedConfig(parsedConfig);

      assertDerivedCredentialsForNoOAuthProvider({
        provider: providerTemplate,
        derivedCredentials,
      });

      await runPreSaveConfigHook({
        provider: providerTemplate,
        config: parsedConfig,
        credentials: derivedCredentials,
      });

      const encryptedCredentials = derivedCredentials
        ? ctx.services.credentialManager.encryptCredentials(derivedCredentials)
        : undefined;

      const nextStatus =
        derivedCredentials !== null
          ? BankConnectionStatus.CONNECTED
          : BankConnectionStatus.PENDING_OAUTH;

      // Update connection with config and advance status
      await ctx.prisma.organizationBankConnection.update({
        where: { id: connection.id },
        data: {
          providerConfig: encryptedConfig,
          name: input.connectionName ?? connection.name,
          status: nextStatus,
          ...(encryptedCredentials !== undefined && {
            credentials: encryptedCredentials,
          }),
        },
      });

      await runPostSaveConfigHook({
        provider: providerTemplate,
        connectionId: connection.id,
        config: parsedConfig,
        credentials: derivedCredentials,
      });

      // API-key / no-OAuth providers: register webhook once credentials exist (same as OAuth complete)
      if (derivedCredentials !== null && !connection.webhookUrl) {
        await ctx.services.bankConnection.setupWebhook({
          connectionId: connection.id,
        });
      }

      return { success: true };
    }),

  /**
   * Step 3: Get bank auth URL (for redirect flow providers)
   */
  getBankAuthUrl: organizationProcedure
    .input(
      z.object({
        connectionId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Find the pending connection
      const connection = await ctx.prisma.organizationBankConnection.findUnique(
        {
          where: {
            id: input.connectionId,
            organizationId: ctx.organization.id,
          },
        },
      );

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      if (!connection.providerConfig) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provider configuration not yet saved",
        });
      }

      if (!connection.callbackUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Callback URL not configured",
        });
      }

      // Decrypt provider config and create provider instance
      const provider =
        await ctx.services.credentialManager.createConfiguredProvider({
          connectionId: connection.id,
        });

      // Use connectionId as state for verification in callback
      const authUrl = provider.getAuthUrl({
        redirectUri: connection.callbackUrl,
        state: connection.id,
      });

      return { authUrl };
    }),

  /**
   * Step 4: Complete OAuth and update the bank connection
   * Called from the callback page after bank redirects back
   * Uses organizationProcedure for security (validates org membership)
   */
  completeBankOAuth: organizationProcedure
    .input(
      z.object({
        callbackId: z.string(),
        code: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Find the pending connection
      const connection = await ctx.prisma.organizationBankConnection.findUnique(
        {
          where: {
            callbackId_organizationId: {
              callbackId: input.callbackId,
              organizationId: ctx.organization.id,
            },
          },
        },
      );

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      if (!connection.providerConfig) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provider configuration not saved",
        });
      }

      if (!connection.callbackUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Callback URL not configured",
        });
      }

      // Decrypt provider config and create provider instance
      const provider =
        await ctx.services.credentialManager.createConfiguredProvider({
          connectionId: connection.id,
        });

      try {
        // Exchange code for credentials
        const credentials = await provider.exchangeCode({
          code: input.code,
          redirectUri: connection.callbackUrl,
        });

        // Encrypt credentials
        const encryptedCredentials =
          ctx.services.credentialManager.encryptCredentials(credentials);

        // Update the connection with credentials and set status to CONNECTED
        await ctx.prisma.organizationBankConnection.update({
          where: { id: connection.id },
          data: {
            credentials: encryptedCredentials,
            status: BankConnectionStatus.CONNECTED,
          },
        });

        // Attempt webhook creation - non-fatal if it fails
        const webhookResult = await ctx.services.bankConnection.setupWebhook({
          connectionId: connection.id,
        });

        return {
          connectionId: connection.id,
          webhookError: webhookResult.error,
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }),

  /**
   * Revalidate a bank connection that needs re-authorization.
   * Supports both redirect (e.g. Qonto) and manual-consent (e.g. Revolut) flows.
   */
  revalidateBankConnection: organizationProcedure
    .input(
      z.object({
        connectionId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await ctx.prisma.organizationBankConnection.findUnique(
        {
          where: {
            id: input.connectionId,
            organizationId: ctx.organization.id,
          },
        },
      );

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      if (
        connection.status !== BankConnectionStatus.NEEDS_REAUTH &&
        connection.status !== BankConnectionStatus.CONNECTED
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connection is not in a revalidatable state",
        });
      }

      if (!connection.providerConfig) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provider configuration not saved",
        });
      }

      if (!connection.callbackUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Callback URL not configured",
        });
      }

      // Look up provider metadata for flow type
      const providerTemplate = ProviderRegistry.getProvider(
        connection.providerId,
      );
      if (!providerTemplate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider not found",
        });
      }

      // Update status to PENDING_OAUTH for both flow types
      await ctx.prisma.organizationBankConnection.update({
        where: { id: connection.id },
        data: { status: BankConnectionStatus.PENDING_OAUTH },
      });

      const flowType = providerTemplate.oauthFlowType;

      if (flowType === "redirect") {
        // For redirect flow, generate auth URL and return it
        const provider =
          await ctx.services.credentialManager.createConfiguredProvider({
            connectionId: connection.id,
          });

        const authUrl = provider.getAuthUrl({
          redirectUri: connection.callbackUrl,
          state: connection.id,
        });

        return {
          flowType: "redirect" as const,
          authUrl,
        };
      }

      // For manual-consent flow, return callback URL and instructions
      return {
        flowType: "manual-consent" as const,
        callbackUrl: connection.callbackUrl,
        setupGuideUrl: providerTemplate.getSetupGuide(),
        providerName: providerTemplate.displayName,
      };
    }),

  /**
   * Delete a pending (incomplete) bank connection
   */
  deletePendingConnection: organizationProcedure
    .input(
      z.object({
        connectionId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const connection = await ctx.prisma.organizationBankConnection.findUnique(
        {
          where: {
            id: input.connectionId,
            organizationId: ctx.organization.id,
          },
        },
      );

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      // Only allow deletion of pending connections
      if (
        connection.status !== BankConnectionStatus.PENDING_CONFIG &&
        connection.status !== BankConnectionStatus.PENDING_OAUTH &&
        connection.status !== BankConnectionStatus.EXPIRED
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot delete an active connection. Use disconnect instead.",
        });
      }

      await ctx.prisma.organizationBankConnection.delete({
        where: { id: connection.id },
      });

      return { success: true };
    }),
});
