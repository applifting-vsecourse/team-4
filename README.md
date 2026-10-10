# Full-stack starter

A neutral pnpm monorepo ready for a new project.

## Stack and structure

- `apps/backend`: NestJS, Prisma, PostgreSQL, BetterAuth, Swagger and React Email.
- `apps/frontend`: React, Vite, TanStack Router/Query, Tailwind, shadcn/ui, Lucide, ky and Zod.
- Backend features live in `src/modules`; infrastructure in `src/core` and `src/shared`.
- Frontend pages live in `src/routes`; features in `src/features`; reusable controls in `src/components/ui`.
- ESLint, Prettier, Jest, Vitest, Husky, lint-staged, Docker and GitHub Actions are configured.
- Agent guidance lives in [CLAUDE.md](CLAUDE.md). [DESIGN.md](DESIGN.md) is empty and ready for the new project's design requirements.

## Start locally

Use Node.js 24 (see `.nvmrc`), pnpm and Docker.

```sh
corepack enable
pnpm install
pnpm dev
```

This creates missing environment files, starts PostgreSQL, applies migrations, runs the empty seed entry point and starts both apps.

| Service            | Address                                  |
| ------------------ | ---------------------------------------- |
| Frontend           | http://localhost:3050                    |
| API                | http://localhost:4050/api                |
| Swagger            | http://localhost:4050/api/docs           |
| Auth documentation | http://localhost:4050/api/auth/reference |

Create your first account through sign-up. No demo users or product data are seeded. Email verification and password reset messages use the console mailer by default; Resend and SMTP adapters remain available.

## Commands

```sh
pnpm check-all                     # lint, types, tests, builds and formatting
pnpm backend test                  # Jest
pnpm frontend test:ci              # Vitest
pnpm backend prisma:migrations:run # create/apply migrations for schema changes
pnpm backend prisma:studio         # database browser
pnpm backend seed                  # project seed entry point (initially empty)
pnpm dev:down                      # stop local PostgreSQL
```

The test runners allow an empty test suite until the new project adds tests.

## Database

The schema and initial migrations contain only authentication tables. The baseline is intended for a fresh database. If reusing a database from the previous application, use a new database rather than applying this rewritten baseline to it. `pnpm backend db:reset` recreates a disposable development database and **deletes its data**.

Development PostgreSQL uses `quacker` as the database, username and password, on port 5433. Copy the environment examples when configuring a new environment; existing local `.env` files are not overwritten automatically.

## Deployment

```sh
cp .env.example .env
# Configure secrets and public BACKEND_URL / FRONTEND_URL.
docker compose up --build
```

The frontend receives its API URL at build time; changing the URL requires rebuilding it. Production applies migrations without seeding.

GitHub Actions retains CI and the course registry/Coolify deployment workflow. Configure repository secrets and deployment destinations for the new project before using deployment.
