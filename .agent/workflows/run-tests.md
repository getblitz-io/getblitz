---
description: Run tests across the monorepo
---

# Running Tests

This workflow covers different testing scenarios.

## Quick Commands

// turbo

### Run all tests

```bash
pnpm test
```

### Run tests for a specific package

```bash
pnpm -F @getblitz/api test
pnpm -F @getblitz/bank-providers test
```

### Run tests in watch mode (for development)

```bash
pnpm -F @getblitz/api vitest
```

### Run a specific test file

```bash
pnpm -F @getblitz/api vitest src/services/payment.service.test.ts
```

### Run tests matching a pattern

```bash
pnpm -F @getblitz/api vitest -t "should create payment"
```

### Run with coverage

```bash
pnpm -F @getblitz/api vitest run --coverage
```

## Test File Conventions

- Place test files next to source files: `my.service.ts` → `my.service.test.ts`
- Or in a `__tests__` directory for complex test setups
- Use `.test.ts` suffix (not `.spec.ts`)

## Debugging Tests

### Run with verbose output

```bash
pnpm -F @getblitz/api vitest --reporter=verbose
```

### Run single test

```bash
pnpm -F @getblitz/api vitest run -t "exact test name"
```

## Pre-commit Hook

Tests are **not** run on pre-commit (only linting and formatting).
Tests **are** run on pre-push via husky.

## CI/CD

Tests run automatically on:

- Pull request creation/update
- Push to main branch
