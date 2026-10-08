# syntax=docker/dockerfile:1.7
FROM node:24-alpine

USER root

RUN apk add --no-cache openssl
RUN corepack enable


WORKDIR /app

# Workspace metadata. Build context must be the repo root:
#   docker build -f apps/backend/Dockerfile -t backend-dev .
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Cached pnpm store: rebuilds reuse it instead of re-downloading, and a failed
# install resumes rather than starting over.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

COPY apps/backend ./apps/backend
COPY apps/frontend ./apps/frontend

RUN chown -R node:node /app

USER node

WORKDIR /app/apps/backend

# Create .env file if it doesn't exist
RUN touch .env

CMD ["pnpm", "start:dev"]
