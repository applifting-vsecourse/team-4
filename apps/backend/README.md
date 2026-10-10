# Backend

NestJS with strict TypeScript, Prisma/PostgreSQL, BetterAuth, Swagger and email adapters.

## Structure

- `src/modules`: feature modules (the starter includes welcome and health endpoints).
- `src/core`: Prisma and email infrastructure.
- `src/shared`: auth and configuration.
- `src/scripts/seed`: an empty seed entry point for project-specific data.
- `prisma`: authentication schema and migrations for a fresh database.

Feature modules can contain controllers/DTOs, services, domain models and repositories. Keep request validation in DTOs and data access in repositories.

## Commands

Run from the repository root:

```sh
pnpm backend start:dev
pnpm backend build
pnpm backend test
pnpm backend prisma:migrations:run
pnpm backend prisma:studio
pnpm backend seed
pnpm backend email:dev
```

See the [root README](../../README.md) for environment setup and deployment. Swagger is available at http://localhost:4050/api/docs.

BetterAuth is mounted at `/api/auth/*`. Its runtime and CLI configurations live under `src/shared/auth`; keep them aligned when changing auth behavior. Email templates live in `src/core/email/templates`; the console adapter is the local default, with Resend and SMTP available through configuration.
