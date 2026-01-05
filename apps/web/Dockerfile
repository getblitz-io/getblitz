FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files for all workspaces
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/bank-providers/package.json ./packages/bank-providers/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/validators/package.json ./packages/validators/
COPY packages/websocket/package.json ./packages/websocket/
COPY tooling/typescript/package.json ./tooling/typescript/
COPY tooling/eslint/package.json ./tooling/eslint/
COPY tooling/prettier/package.json ./tooling/prettier/
COPY tooling/tailwind/package.json ./tooling/tailwind/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source files
COPY tooling ./tooling
COPY packages ./packages
COPY apps/web ./apps/web
COPY turbo.json ./turbo.json

# Build arguments with defaults (can be overridden with --build-arg)
# These are only used during build for validation, actual values provided at runtime
ARG DATABASE_URL=mysql://dummy:dummy@localhost:3306/dummy
ARG AUTH_SECRET=dummy-build-secret
ARG AUTH_GOOGLE_ID=dummy
ARG AUTH_GOOGLE_SECRET=dummy
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000

# Generate Prisma client before building
# This must happen before TypeScript compilation since the database package imports the generated client
# DATABASE_URL is not actually used for generation, but prisma.config.ts requires it
WORKDIR /app/packages/database
RUN DATABASE_URL="${DATABASE_URL}" pnpm prisma:generate

# Build standalone server (compiles server.ts)
WORKDIR /app/apps/web
RUN CI=true \
    DATABASE_URL="${DATABASE_URL}" \
    AUTH_SECRET="${AUTH_SECRET}" \
    AUTH_GOOGLE_ID="${AUTH_GOOGLE_ID}" \
    AUTH_GOOGLE_SECRET="${AUTH_GOOGLE_SECRET}" \
    NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL}" \
    pnpm build:standalone

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy Next.js build output
COPY --from=base /app/apps/web/.next ./.next
COPY --from=base /app/apps/web/public ./public
COPY --from=base /app/apps/web/dist ./dist
COPY --from=base /app/apps/web/package.json ./

# Copy node_modules and packages for runtime
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages

EXPOSE 3000

CMD ["node", "dist/server.js"]

