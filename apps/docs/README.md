# GetBlitz Documentation Site

This folder contains the official documentation for **GetBlitz**, a SEPA Instant Transfer Payment Gateway. It includes our integration guides, webhook references, and available bank connections.

The documentation is built with [Docusaurus](https://docusaurus.io/), allowing us to easily write and maintain documentation in Markdown and MDX. The site itself is statically generated and hosted alongside the main GetBlitz app in our monorepo.

## Structure

- `/docs`: Contains all Markdown documentation files (e.g. `index.md`, `integration-guide.md`, `webhooks.md`, `banks/`).
- `/static`: Static assets such as images and favicons.
- `docusaurus.config.ts`: Configuration file for the site, including navbar links, footer, and theme customization.
- `sidebars.ts`: Specifies the sidebar navigation structure.

## Local Development

To run the documentation site locally for testing changes:

From the root of the Turborepo workspace, you can run:

```bash
pnpm --filter @getblitz/docs dev
```

Alternatively, from within this directory (`apps/docs`):

```bash
pnpm install
pnpm run dev
```

This will run the local development server and usually expose the site at `http://localhost:3000`. Most changes are reflected live without having to restart the server.

## Build

To build the static site for production:

```bash
pnpm --filter @getblitz/docs build
```

This generates the static HTML in the `build/` directory, ready to be served.
