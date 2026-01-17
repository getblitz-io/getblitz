import { Suspense } from "react";
import { notFound } from "next/navigation";

import type { OAuthFlowType } from "@getblitz/bank-providers";
import { ProviderRegistry } from "@getblitz/bank-providers";

import { api } from "~/trpc/server";
import { ConfigureProviderClient } from "./configure-provider-client";

interface ConfigureProviderPageProps {
  params: Promise<{ slug: string; providerId: string }>;
  searchParams: Promise<{ connectionId?: string }>;
}

export default async function ConfigureProviderPage({
  params,
  searchParams,
}: ConfigureProviderPageProps) {
  const { slug, providerId } = await params;
  const { connectionId } = await searchParams;

  const isReconfiguring = !!connectionId;

  // Validate provider exists
  const providerMetadata = ProviderRegistry.getProvider(providerId);
  if (!providerMetadata) {
    notFound();
  }

  const caller = await api();

  // For new connections: create pending connection server-side (runs once per request)
  let pendingConnectionData: {
    connectionId: string;
    callbackUrl: string;
    oauthFlowType: OAuthFlowType;
    setupGuideUrl: string | null;
  } | null = null;

  if (!isReconfiguring) {
    pendingConnectionData = await caller.organization.initBankConnection({
      slug,
      providerId,
    });
  }

  // Fetch config schema (with existing config if reconfiguring)
  const configData = await caller.organization.getProviderConfigSchema({
    providerId,
    connectionId: connectionId ?? pendingConnectionData?.connectionId,
    slug,
  });

  // For reconfiguring: fetch existing connection name
  let existingConnectionName: string | null = null;
  if (isReconfiguring) {
    const connections = await caller.organization.getBankConnections({ slug });
    const existingConnection = connections.find((c) => c.id === connectionId);
    existingConnectionName = existingConnection?.name ?? null;
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      }
    >
      <ConfigureProviderClient
        slug={slug}
        providerDisplayName={providerMetadata.displayName}
        pendingConnectionId={pendingConnectionData?.connectionId ?? null}
        callbackUrl={pendingConnectionData?.callbackUrl ?? null}
        oauthFlowType={pendingConnectionData?.oauthFlowType ?? null}
        setupGuideUrl={
          pendingConnectionData?.setupGuideUrl ??
          configData.setupGuideUrl ??
          null
        }
        configSchema={configData.schema}
        defaultConfig={configData.defaultConfig}
        existingConnectionId={connectionId ?? null}
        existingConnectionName={existingConnectionName}
      />
    </Suspense>
  );
}
