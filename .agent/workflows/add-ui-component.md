---
description: Add a new UI component using shadcn/ui
---

# Add UI Component

This workflow guides adding new UI components, either from shadcn/ui or custom.

## Adding shadcn/ui Component

1. **Add from shadcn/ui registry**:

```bash
pnpm ui-add
```

This is interactive and will prompt for component selection.

Or specify components directly:

```bash
pnpm -F @getblitz/ui dlx shadcn@latest add button dialog
```

2. Components are added to `packages/ui/src/components/ui/`

## Creating Custom Component

1. **Create component file** at `packages/ui/src/components/my-component.tsx`:

```tsx
"use client";

import { cn } from "../lib/utils";

interface MyComponentProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "secondary";
}

export function MyComponent({
  children,
  className,
  variant = "default",
}: MyComponentProps) {
  return (
    <div
      className={cn(
        "base-styles",
        variant === "secondary" && "secondary-styles",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

2. **Export from index** at `packages/ui/src/index.ts`:

```typescript
export { MyComponent } from "./components/my-component";
```

3. **Use in apps**:

```tsx
import { MyComponent } from "@getblitz/ui";
```

## Component Guidelines

### File Structure

```
packages/ui/src/
├── components/
│   ├── ui/              # shadcn/ui components
│   │   ├── button.tsx
│   │   └── dialog.tsx
│   └── my-component.tsx # Custom components
├── lib/
│   └── utils.ts         # Utilities (cn, etc.)
└── index.ts             # Exports
```

### Styling

- Use Tailwind CSS v4 classes
- Use `cn()` helper for conditional classes
- Support `className` prop for customization
- Define variants using `class-variance-authority` (cva) for complex variants

### Client Components

Add `"use client"` directive for:

- Components using React hooks
- Components with event handlers
- Interactive components

### TypeScript

- Always define explicit prop types
- Export types when useful for consumers
- Use generics for flexible APIs
