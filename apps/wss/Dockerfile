FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/wss/package.json ./apps/wss/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/websocket/package.json ./packages/websocket/
COPY tooling/typescript/package.json ./tooling/typescript/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY tooling/typescript ./tooling/typescript
COPY packages/shared-types ./packages/shared-types
COPY packages/websocket ./packages/websocket
COPY apps/wss ./apps/wss

# Build shared-types first
WORKDIR /app/packages/shared-types
RUN pnpm build

# Build websocket package
WORKDIR /app/packages/websocket
RUN pnpm build

# Build wss
WORKDIR /app/apps/wss
RUN pnpm build

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=base /app/apps/wss/dist ./dist
COPY --from=base /app/apps/wss/package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages

ENV NODE_ENV=production
ENV WSS_PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
