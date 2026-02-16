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

  // Validate provider exists
  const providerMetadata = ProviderRegistry.getProvider(providerId);
  if (!providerMetadata) {
    notFound();
  }

  const caller = await api();

  // For new connections: create pending connection server-side (runs once per request)
  let connectionData: {
    name: string | null;
    connectionId: string;
    callbackUrl: string;
    oauthFlowType: OAuthFlowType;
    setupGuideUrl: string | null;
  };

  try {
    if (!connectionId) {
      connectionData = await caller.organization.initBankConnection({
        slug,
        providerId,
      });
    } else {
      const connection = await caller.organization.getBankConnectionById({
        connectionId,
        slug,
      });
      connectionData = {
        name: connection.name,
        connectionId: connection.id,
        callbackUrl: connection.callbackUrl,
        oauthFlowType: connection.providerOAuthFlowType,
        setupGuideUrl: connection.providerSetupGuideUrl,
      };
    }
  } catch (error) {
    //todo: handle error
    console.error(error);
    notFound();
  }

  // Fetch config schema (with existing config if reconfiguring)
  const configData = await caller.organization.getProviderConfigSchema({
    providerId,
    connectionId: connectionId,
    slug,
  });

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
        operation={connectionId ? "update" : "create"}
        providerDisplayName={providerMetadata.displayName}
        connectionId={connectionData.connectionId}
        callbackUrl={connectionData.callbackUrl}
        oauthFlowType={connectionData.oauthFlowType}
        setupGuideUrl={configData.setupGuideUrl}
        configSchema={configData.schema}
        defaultConfig={configData.defaultConfig}
        connectionName={connectionData.name}
      />
    </Suspense>
  );
}
