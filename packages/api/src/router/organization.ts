import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type {
  ProviderConfig,
  ProviderConfigSchema,
} from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";

import type { BankConnectionWithProvider } from "../interfaces";
import { ConflictError, ForbiddenError, NotFoundError } from "../interfaces";
import {
  createTRPCRouter,
  organizationProcedure,
  protectedProcedure,
} from "../trpc";

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

  // Generate new API key
  generateApiKey: organizationProcedure.mutation(async ({ ctx }) => {
    try {
      return await ctx.services.organization.generateApiKey({
        organizationId: ctx.organization.id,
        userId: ctx.session.user.id,
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
        return await ctx.services.organization.deleteApiKey({
          keyId: input.keyId,
          userId: ctx.session.user.id,
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
          defaultConfig = ctx.services.credentialManager.decryptProviderConfig(
            connection.providerConfig,
          );
        }

        return {
          schema: provider.getProviderConfigSchema(),
          defaultConfig,
          setupGuideUrl: provider.getSetupGuide(),
        };
      },
    ),

  // Configure a provider for an organization (step 1: save config before OAuth)
  configureProvider: organizationProcedure
    .input(
      z.object({
        slug: z.string(),
        providerId: z.string(),
        providerConfig: z.record(z.string(), z.unknown()), // Dynamic config based on provider
        connectionId: z.string().optional(), // Optional: if provided, update existing connection
        name: z.string().optional(), // Optional: custom name for the connection
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const provider = ProviderRegistry.getProvider(input.providerId);
      if (!provider) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid provider",
        });
      }

      // Encrypt the provider config
      const encryptedConfig =
        ctx.services.credentialManager.encryptProviderConfig(
          input.providerConfig as ProviderConfig,
        );

      // If connectionId is provided, update existing connection
      if (input.connectionId) {
        const existingConnection =
          await ctx.prisma.organizationBankConnection.findUnique({
            where: { id: input.connectionId },
          });

        if (!existingConnection) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connection not found",
          });
        }

        // Verify connection belongs to the organization
        if (existingConnection.organizationId !== ctx.organization.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        // Update existing connection's config and optionally name
        const updateData: { providerConfig: string; name?: string } = {
          providerConfig: encryptedConfig,
        };
        if (input.name !== undefined) {
          updateData.name = input.name;
        }

        await ctx.prisma.organizationBankConnection.update({
          where: { id: existingConnection.id },
          data: updateData,
        });
        return { connectionId: existingConnection.id, updated: true };
      }

      // Create new connection with null credentials (will be filled after OAuth)
      // Note: We now allow multiple connections per provider
      const connection = await ctx.prisma.organizationBankConnection.create({
        data: {
          organizationId: ctx.organization.id,
          providerId: input.providerId,
          providerConfig: encryptedConfig,
          credentials: null,
          webhookUrl: null,
          webhookSecret: null,
          name: input.name ?? null,
        },
      });

      return { connectionId: connection.id, updated: false };
    }),

  // Get bank auth URL (for OAuth providers) - now uses saved provider config
  getBankAuthUrl: organizationProcedure
    .input(
      z.object({
        connectionId: z.string(),
        redirectUri: z.url(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Find the connection to get the provider config
      const connection = await ctx.prisma.organizationBankConnection.findFirst({
        where: {
          id: input.connectionId,
        },
      });

      if (!connection) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Provider not configured. Please configure the provider first.",
        });
      }

      // Decrypt the provider config and create a configured provider instance
      const providerConfig =
        ctx.services.credentialManager.decryptProviderConfig(
          connection.providerConfig,
        );
      const provider = ProviderRegistry.createProvider(
        connection.providerId,
        providerConfig,
      );

      if (!provider.getAuthUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provider does not support OAuth",
        });
      }

      // Encode providerId and slug into state for callback identification
      const state = `${connection.id}:${ctx.organization.slug}:${Math.random().toString(36).substring(7)}`;

      return {
        url: provider.getAuthUrl({ redirectUri: input.redirectUri, state }),
        state,
      };
    }),

  // Exchange bank OAuth code (uses previously configured provider config)
  completeBankConnection: organizationProcedure
    .input(
      z.object({
        connectionId: z.string(),
        randomId: z.string(),
        code: z.string(),
        redirectUri: z.url(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Find the existing connection with provider config
      const existingConnection =
        await ctx.prisma.organizationBankConnection.findFirst({
          where: {
            id: input.connectionId,
            organizationId: ctx.organization.id,
          },
        });

      if (!existingConnection) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Provider not configured. Please configure the provider first.",
        });
      }

      // Decrypt provider config and create configured provider instance
      const providerConfig =
        ctx.services.credentialManager.decryptProviderConfig(
          existingConnection.providerConfig,
        );
      const provider = ProviderRegistry.createProvider(
        existingConnection.providerId,
        providerConfig,
      );

      if (!provider.exchangeCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provider does not support OAuth",
        });
      }

      try {
        // Exchange code using configured provider
        const credentials = await provider.exchangeCode({
          code: input.code,
          redirectUri: input.redirectUri,
        });

        // Encrypt and store credentials
        const encryptedCredentials =
          ctx.services.credentialManager.encryptCredentials(credentials);

        await ctx.prisma.organizationBankConnection.update({
          where: { id: existingConnection.id },
          data: { credentials: encryptedCredentials },
        });

        // Attempt webhook creation - non-fatal if it fails
        const webhookResult = await ctx.services.bankConnection.setupWebhook({
          connectionId: existingConnection.id,
          providerId: existingConnection.providerId,
          credentials,
        });

        return {
          connectionId: existingConnection.id,
          webhookError: webhookResult.error,
          slug: ctx.organization.slug,
        };
      } catch (error: unknown) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
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
        providerId: connection.providerId,
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

      // Create a configured provider instance
      const providerConfig =
        ctx.services.credentialManager.decryptProviderConfig(
          connection.providerConfig,
        );
      const provider = ProviderRegistry.createProvider(
        connection.providerId,
        providerConfig,
      );

      if (!provider.listAccounts) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provider does not support listing accounts",
        });
      }

      try {
        // Use credential manager to get valid credentials (refreshes if needed)
        const { credentials } =
          await ctx.services.credentialManager.getValidCredentials({
            connectionId: connection.id,
          });
        return await provider.listAccounts({ credentials });
      } catch (error: unknown) {
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
          // If provider not found, return minimal data
          return {
            id: connection.id,
            name: connection.name,
            connectionId: connection.id,
            providerId: connection.providerId,
            hasCredentials: !!connection.credentials,
            webhookUrl: connection.webhookUrl,
            webhookSecret: connection.webhookSecret,
            createdAt: connection.createdAt,
            updatedAt: connection.updatedAt,
            providerName: connection.providerId,
            providerDomain: null,
            providerAuthType: "none" as const,
          };
        }

        return {
          id: connection.id,
          name: connection.name,
          connectionId: connection.id,
          providerId: connection.providerId,
          hasCredentials: !!connection.credentials,
          webhookUrl: connection.webhookUrl,
          webhookSecret: connection.webhookSecret,
          createdAt: connection.createdAt,
          updatedAt: connection.updatedAt,
          providerName: provider.displayName,
          providerDomain: provider.domain,
          providerAuthType: provider.authType,
        };
      });
    },
  ),

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
});
