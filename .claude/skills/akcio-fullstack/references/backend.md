# Backend conventions (`apps/backend`)

Stack: NestJS 11 on Express 5, TypeScript, Prisma 7 with the `pg` driver adapter, PostgreSQL, BetterAuth, Swagger, React Email, Jest. Port 4050, global prefix `api`, Swagger at `/api/docs`, BetterAuth reference at `/api/auth/reference`. Development database: PostgreSQL on port 5433, user, password and database all `quacker`.

## Layout

```
src/
  modules/<feature>/   controllers/ (+ dto/), services, domain models, repositories, <feature>.module.ts
  core/                reusable infrastructure: prisma/, email/
  shared/              auth/, config/ - cross-cutting, needs adapting to this app
  scripts/seed/        seed entry point (currently empty)
  generated/           Prisma client (generated, gitignored)
prisma/                schema.prisma, migrations/
```

Feature modules contain controllers/DTOs, services, domain models and repositories. Request validation lives in DTOs; data access lives in repositories. Register each module in `src/app.module.ts`.

The reference module is `modules/welcome`.

## Rules that fail `pnpm backend lint:check`

- DTOs (`*.dto.ts`, `dto/`, `controllers/`) may be imported only by controllers and other DTOs. Services and repositories depend on domain types.
- No `../` imports. Use `@/...` (points at `src`); `./` for siblings.
- `no-floating-promises` is an error; `explicit-function-return-type` and `no-explicit-any` warn.

Formatting: single quotes, semicolons, trailing commas, imports sorted (third party, `src/`, relative). Run `pnpm format`.

## Controllers and validation

- There is no global `ValidationPipe`. The sample controller applies `@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))` per controller. Do the same, or ask before adding a global pipe.
- Input DTOs need `class-validator` decorators and `class-transformer` where types are converted. Output DTOs document the response for Swagger. Annotate endpoints (`@ApiOperation`, plus `@ApiProperty` / response decorators where the schema needs them) so `/api/docs` stays accurate: the frontend zod schemas mirror it.
- Nest 11 on Express 5: wildcard routes need names (`/*splat`).
- Return domain-mapped DTOs, never raw Prisma rows with internal fields.

## Auth

- BetterAuth is mounted at `/api/auth/*` in `main.ts` before `express.json()`. Treat it as a black box.
- Protect an endpoint with `@UseGuards(AuthenticatedUserGuard)` (`@/shared/auth/guards/authenticated-user.guard`): 401 when not signed in. Read the user with `@User()` (`@/shared/auth/decorators/user.decorator`); it returns the BetterAuth session user (`id`, `email`, `name`, `role` = `user` | `admin`).
- A module that uses the guard must import `AuthModule` (it exports the BetterAuth provider the guard injects).
- Current BetterAuth config: e-mail and password, `username` and `openAPI` plugins, extra `role` field. There is no organization or magic-link plugin yet. Organization isolation, multiple organizations per organizer and the participant magic link (S2-02, S2-03, S2-13) are tech-lead decisions (`delivery.md` T1): do not add plugins or invent a parallel auth system on your own.
- When BetterAuth options change, keep three places aligned: `src/shared/auth/config/better-auth.config.ts`, `src/shared/auth/utils/cli-auth-client.ts`, and the plugins in the frontend `features/auth/lib/auth-client.ts`. Regenerate schema with `pnpm backend auth:generate`, then create a migration. Never hand-edit the `user`, `session`, `account`, `verification` tables.
- Authorization (which organization's data a user may touch) must be enforced in the backend on every read and write, not only hidden in the UI.

## Database (Prisma 7)

- Schema: `prisma/schema.prisma`. The client is generated to `src/generated/prisma` and imported from `@/generated/prisma/client`. Services use `PrismaService` (`@/core/prisma/prisma.service`), which connects through the `pg` adapter using `DATABASE_URL`.
- Naming in the existing schema: `@@map("snake_case_table")`, enums mapped with `@@map`.
- After editing the schema: `pnpm backend prisma:migrations:run` (`prisma migrate dev`, creates and applies, interactive) or `pnpm backend prisma:migrations:generate <name>` (create only), then apply. Commit the migration SQL. Never edit an applied migration. `prisma generate` runs inside `build` and `start`.
- Money, unique variable symbols, capacity reservation and isolation are modelled in T1 (`delivery.md`). Until the model exists, do not pick a representation (for example float for money). Capacity reservation must be atomic under concurrent requests (transaction plus a database constraint or row lock, with a test that races two requests for the last bed).
- `pnpm backend db:reset` deletes the development database. Use it only on a disposable database.
- Seed data: `src/scripts/seed/seed/seed-database.ts` (run by `pnpm backend seed`). Demo data must contain no real personal data.

## Config and environment

- `src/shared/config/config.service.ts` is the typed config (`@applifting-io/nestjs-decorated-config`): add a field with `@Env('NAME', { ... })` and a `class-validator` decorator. `Config` is injectable everywhere.
- Add every new variable to `apps/backend/.env.example` (and the root `.env.example` when the production compose stack needs it). `pnpm env:check` only copies missing `.env` files from the examples, it never overwrites.

## E-mail

- Templates are React Email components in `src/core/email/templates/*.tsx` (preview: `pnpm backend email:dev`, export: `pnpm backend email:export`). `render.ts` turns them into HTML.
- Send through the `EmailService` interface (`sendEmail(to, subject, html)`), injected with the token `'EmailService'` (`MailModule` is global). Adapter order: Resend if `RESEND_API_KEY`, else SMTP, else the console mailer.
- The console mailer is not evidence of delivery. The sprint mandates Resend for real sending (T3). Do not put access tokens (magic links) into logs.

## Tests

Jest (`ts-jest`), files `*.spec.ts` next to the source, `jest-mock-extended` for mocks, `@/` alias mapped. `pnpm backend test`. The suite passes with no tests, so a green run proves nothing: write tests for the behaviour you add.
