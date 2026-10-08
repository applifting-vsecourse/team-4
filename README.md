# Quacker — full-stack starter template

Starter template for [4IT580](https://4it580.vse.cz) team projects: a minimal, working full-stack app you fork and grow into your own product.

**Stack:** React + Vite + TanStack Router/Query + Tailwind/shadcn (frontend) · NestJS + Prisma + PostgreSQL + BetterAuth (backend) · pnpm workspaces.

What's included: working login/signup (BetterAuth — you use it, you don't build it), one worked-example feature (the quack feed: read a list, post a new one — copy its pattern), seeded demo data, example tests, CI. The full demo app this template was trimmed from lives on the `reference/full-app` branch.

## Prerequisites

- Node.js 24 — the version in [`.nvmrc`](.nvmrc). With nvm or fnm, `nvm use` picks it up from anywhere in the repo (they search parent directories), and every `package.json` declares it too, so pnpm warns if you are on an older one.
- pnpm — `corepack enable` picks the version from `package.json`
- Docker (for the database)

## Quick start

```shell
pnpm install
pnpm dev
```

`pnpm dev` does everything: creates `.env` files from examples, starts Postgres in Docker, applies migrations, seeds demo data, and runs both dev servers.

| What               | Where                                                |
| ------------------ | ---------------------------------------------------- |
| Frontend           | http://localhost:3050                                |
| API                | http://localhost:4050/api                            |
| API docs (Swagger) | http://localhost:4050/api/docs                       |
| Auth API docs      | http://localhost:4050/api/auth/reference             |
| DB browser         | `pnpm backend prisma:studio` → http://localhost:5555 |

The ports are deliberately odd — 3050, 4050, and Postgres on 5433 rather than the usual 3000, 4000 and 5432 — so the stack doesn't fight whatever else you have running. They're pinned rather than auto-incremented: the API only accepts requests from the frontend's exact origin, so a port that silently moved would surface as an unexplained CORS error.

### Seeded users

| Email                          | Password        |
| ------------------------------ | --------------- |
| `caffeinatedduck@example.com`  | `password1`     |
| `deepduckthoughts@example.com` | `password2`     |
| `breadcritic@example.com`      | `password3`     |
| `migrationseason@example.com`  | `password4`     |
| `pondadmin@example.com`        | `password5`     |
| `admin@example.com`            | `adminpassword` |

Verification/reset emails are printed to the backend terminal (console mailer) unless you configure Resend or SMTP in `apps/backend/.env`.

## Everyday commands

```shell
pnpm check-all                     # lint + type-check + tests + builds (what CI runs)
pnpm backend test                  # backend unit tests (jest)
pnpm frontend test:ci              # frontend component tests (vitest)
pnpm backend prisma:migrations:run # create + apply a migration after schema changes
pnpm backend prisma:studio         # browse/edit the database
pnpm backend seed                  # re-seed the database
pnpm dev:down                      # stop the database container
```

## Deployment

The whole app ships as one Docker Compose stack — Postgres, the backend, and the frontend (built to static files, served by nginx). See [`docker-compose.yml`](docker-compose.yml).

```shell
cp .env.example .env     # then edit: secrets, and the public URLs
docker compose up --build
```

On **Coolify** (Hetzner): create a Docker Compose resource pointing at this repo, set the variables from `.env.example` in the resource's environment, and assign domains to the `frontend` and `backend` services. Coolify's proxy handles TLS, so the published host ports only matter for local runs.

Two things worth knowing:

- **You set exactly two URLs**, `BACKEND_URL` and `FRONTEND_URL`. The backend uses them for CORS, BetterAuth trusted origins and password-reset links; the frontend's API URL is derived from `BACKEND_URL`. Point them at the real domains or the backend rejects the browser.
- **The frontend bakes its API URL in at build time** (`VITE_*` are build args, not runtime env), so changing `BACKEND_URL` needs a rebuild, not just a restart.
- **Production migrates but does not seed** — the container runs `prisma migrate deploy` then starts. A fresh deployment has an empty database, so the first account is created through the sign-up form.

## When something goes wrong

| Symptom                                                  | Cause / fix                                                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev` fails immediately, Docker errors              | Docker Desktop isn't running. Start it and retry.                                                                                                                                    |
| `Port 3050 is already in use`                            | Another app has it. Stop it — the port is pinned on purpose, because the API only accepts requests from `http://localhost:3050`.                                                     |
| Page loads but login fails, console shows a CORS error   | The frontend is on a different port than the API expects. See above.                                                                                                                 |
| `EADDRINUSE :::4050`                                     | An old backend is still running: `lsof -i :4050` then kill the process.                                                                                                              |
| Prisma: "column does not exist" after editing the schema | You changed `schema.prisma` without migrating: `pnpm backend prisma:migrations:run`.                                                                                                 |
| Want the demo data back / a clean database               | `pnpm backend db:reset` — it replays the migrations and re-runs the seed. (Plain `pnpm backend seed` does **not** wipe an existing database; it skips when users are already there.) |
| A commit is blocked by lint or formatting                | The pre-commit hook auto-fixes what it can; fix the rest, or `git commit --no-verify` to bypass it once.                                                                             |
| Browser shows a red error overlay while typing           | That's the type/lint checker, not a crash. Read the message — the app is still running.                                                                                              |

## Layout

```
apps/backend/   NestJS — src/modules (features), src/core, src/shared; prisma/ (schema, migrations)
apps/frontend/  React — src/routes (pages), src/features (feature folders), src/components (UI kit)
```

Working conventions for AI-assisted development: [`CLAUDE.md`](CLAUDE.md). UI rules every screen must follow: [`DESIGN.md`](DESIGN.md).
