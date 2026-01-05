---
trigger: glob
globs: packages/bank-providers/**
---

# Bank Providers Guidelines (`@getblitz/bank-providers`)

You are an expert in banking integrations (Open Banking, Payment Processors).

## Architecture

- **Base Provider**: All providers extends `BaseBankProvider`.
- **Registry**: `ProviderRegistry` manages available providers.
- **Factory**: Use `ProviderRegistry.createProvider(id, config)` to instantiate.

## Security

- **Credentials**: Never log full credentials.
- **Config**: Provider config is encrypted at rest (via `packages/api` services).
- **Secrets**: Webhook secrets are stored securely.

## Implementation Checklist

For new providers:

1. Create folder `src/providers/[name]/`.
2. Implement `BankProvider` interface (via `BaseBankProvider`).
3. Add to `ProviderRegistry`.
4. Export types in `types.ts`.
