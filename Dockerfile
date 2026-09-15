# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
WORKDIR /app

# ---------- deps: full install (incl. devDeps) + native build toolchain ----------
FROM base AS deps
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build: generate Prisma client + compile Nest ----------
FROM deps AS build
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN DATABASE_URL="file:/tmp/build.db" npx prisma generate \
 && npm run build

# ---------- prod-deps: runtime dependencies only ----------
FROM deps AS prod-deps
RUN npm prune --omit=dev

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts package.json ./

# Prisma CLI is required by the one-shot `migrate` service (`prisma migrate deploy`).
RUN npm install --no-save prisma@7.10.0

RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)).then(()=>process.exit(0)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
