# Documentation

Welcome to the GetBlitz Payment Gateway documentation.

## Table of Contents

### Bank Providers

Documentation for setting up and configuring bank providers:

| Provider                          | Description                             |
| --------------------------------- | --------------------------------------- |
| [Qonto](./banks/qonto.md)         | Business banking integration via OAuth2 |
| [Test Bank](./banks/test-bank.md) | Mock provider for local development     |

### Additional Resources

- [Main README](../README.md) - Project overview and quick start
- [Deployment Guide](../DEPLOYMENT.md) - Production deployment instructions
- [API Reference](../README.md#api-reference) - REST API documentation

## Getting Started

1. **Development**: Start with the [Test Bank](./banks/test-bank.md) to build and test your integration locally
2. **Production**: Follow the [Qonto guide](./banks/qonto.md) to set up real bank connectivity

## Adding New Documentation

When adding new documentation:

1. Create a new folder under `docs/` for the topic (e.g., `docs/webhooks/`)
2. Add a README.md in the folder for the main content
3. Update this index file with a link to the new documentation
