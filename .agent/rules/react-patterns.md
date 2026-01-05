---
trigger: glob
globs: apps/web/**, packages/ui/**, packages/getblitz-client/**
---

# React & UI Guidelines (`@getblitz/ui`, `@getblitz/web`)

You are an expert in React 19, Next.js 15, and shadcn/ui.

## Core Principles

- **Server Components**: Default to Server Components. Use `'use client'` only when strictly necessary (state, effects, event handlers).
- **Styling**: Use Tailwind CSS v4.
- **Components**: Use `shadcn/ui` components from `@getblitz/ui`.

## Component Patterns

- **Definition**:
  ```tsx
  export function MyComponent({
    className,
    ...props
  }: React.ComponentProps<"div">) {
    return <div className={cn("base-styles", className)} {...props} />;
  }
  ```
- **Props**: Extend `React.ComponentProps<"element">` for HTML attributes.
- **Classes**: Always use `cn()` utility for merging classNames.
- **Variants**: Use `cva` (class-variance-authority) for variant styles.

## Next.js Patterns

- **App Router**:
  - `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`.
  - Use `(folder)` for route groups.
  - Use `_folder` for private folders/components.
- **Data Fetching**: Fetch data in Server Components or use tRPC.

## UI Package

- Components in `packages/ui` must be reusable.
- Import standard components from `@getblitz/ui` (e.g., `import { Button } from "@getblitz/ui/button"` or mapped exports).
