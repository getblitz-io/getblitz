---
name: getblitz-ui-components
description: How to add and structure UI components in the GetBlitz interface. Use this when tasked with building frontend UI or components.
---

# GetBlitz UI Components

This project uses Tailwind CSS v4 and a customized shadcn/ui library setup. Follow these rules when designing or adding components:

## Predefined Components (shadcn)

If the component is a standard UI element (like button, dialog, forms):

1. Add it using the CLI:
   `pnpm -F @getblitz/ui dlx shadcn@latest add [component]`

## Custom Components

If the component is unique to the application:

1. Build it inside `packages/ui/src/components/`.
2. Utilize the `cn()` utility for class merging.
3. Use `cva` (class variance authority) for defining component variations (e.g., size, variant).
4. Export the custom component from `packages/ui/src/index.ts`.
