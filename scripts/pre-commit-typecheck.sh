#!/bin/bash
# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$' || true)

# If no staged TypeScript/JavaScript files, skip typecheck
if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Run turbo typecheck on packages affected by staged files
# Using --filter='[HEAD]' compares working directory (including staged) against HEAD
pnpm exec turbo run typecheck --filter='[HEAD]' --continue

