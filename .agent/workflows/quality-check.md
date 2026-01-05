---
description: Run full quality checks before committing/pushing
---

# Quality Checks

Run the full quality check suite to ensure code is production-ready.

## Full Check Suite

// turbo-all

1. **TypeScript type checking**:

```bash
pnpm typecheck
```

2. **ESLint linting**:

```bash
pnpm lint
```

3. **Format check** (Prettier):

```bash
pnpm format
```

4. **Run all tests**:

```bash
pnpm test
```

## Auto-Fix Issues

### Fix lint issues

```bash
pnpm lint:fix
```

### Fix formatting

```bash
pnpm format:fix
```

## Pre-commit (Automatic)

The pre-commit hook automatically runs:

- Prettier formatting on staged files

## Pre-push (Automatic)

The pre-push hook automatically runs:

- Full test suite

## Workspace Lint

Check monorepo workspace configuration:

```bash
pnpm lint:ws
```

This runs `sherif` to validate workspace setup.

## Common Issues

### "Type 'X' is not assignable to type 'Y'"

- Check import paths
- Regenerate Prisma client: `pnpm db:generate`
- Clear Turbo cache: `rm -rf .turbo`

### ESLint errors in generated files

- Add to `.eslintignore` if appropriate
- Check `eslint.config.mjs` for proper ignores

### Prettier conflicts with ESLint

- The project uses ESLint Stylistic (no Prettier-ESLint conflicts)
- Check `@getblitz/prettier-config` for settings
