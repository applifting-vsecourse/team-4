# akc.io

akc.io is an event management platform being developed by Team 4 for the VŠE 4IT580 course. It aims to bring registrations, accommodation, participant payments and organizer workflows into one place, with a self-service area for participants.

The planned platform serves events such as camps, sports training camps, company retreats and summer schools. Organizers manage events and their teams; participants discover events, apply and keep track of their registration and payments.

## Project scope

The MVP backlog covers:

- **Events and registration:** multiple events and dates with separate prices and capacities, registration windows, participant types, age-dependent fields and participation terms.
- **Accommodation and attendance:** rooms and beds, accommodation preferences, capacity tracking, waiting lists and configurable manual or automatic decisions.
- **Payments and cancellations:** payment instructions with a variable symbol and QR code, bank CSV imports, payment matching, balances, reminders and cancellation fees.
- **Participant self-service:** access through a one-time link or code, registration and payment overviews, and changes or cancellations within organizer-defined rules.
- **Organizer workspace:** dashboards, participant filters and CSV exports, participant details, internal notes and change history.
- **Organizations and access:** team invitations, roles and permissions, separation of organization data, and consent records including legal guardians.
- **Public discovery and communication:** a landing page, event catalog, shareable event details and transactional emails.
- **Operations:** monitoring, backups and recovery checks, separate environments, automated deployment, critical end-to-end tests and protection against concurrent capacity overbooking.

Installment payment plans (F22) and refunds (F31) are outside the MVP scope. See the [feature coverage map](docs/user-stories/coverage.md) for individual requirements and dependencies.

## Current status

This repository currently contains the akc.io application foundation and product backlog. The application includes account sign-up and sign-in, a basic home page, an authenticated dashboard placeholder, welcome and health API endpoints, and email infrastructure. The database schema contains authentication tables only.

The event, accommodation and payment workflows described above are planned requirements, not implemented features. Local demo data can be added with `pnpm backend seed`; see the seed source for accounts.

## Product documentation

- [Feature breakdown](Akc.io_feature_breakdown_final.xlsx) — source workbook describing the project scope.
- [User stories](docs/user-stories/README.md) — 74 stories covering 62 features, including 72 MVP stories and two stories outside the MVP.
- [Coverage map](docs/user-stories/coverage.md) — links between source features and stories.
- [Story manifest](docs/user-stories/manifest.json) — import metadata, priorities and approval status.

Stories and their acceptance criteria are written in Czech. To validate the story files and preview the GitHub issue import without creating issues, run:

```sh
python3 docs/user-stories/import.py
```

See the [user story guide](docs/user-stories/README.md) for the import workflow.

## Technology and structure

The project is a TypeScript pnpm monorepo with two applications.

| Area        | Technologies                                                                        |
| ----------- | ----------------------------------------------------------------------------------- |
| Frontend    | React, Vite, TanStack Router and Query, Tailwind CSS, shadcn/ui, Lucide, ky and Zod |
| Backend     | NestJS, Prisma, PostgreSQL, BetterAuth, Swagger and React Email                     |
| Development | ESLint, Prettier, Jest, Vitest, Husky and lint-staged                               |
| Deployment  | Docker Compose and GitHub Actions                                                   |

```text
apps/
  backend/       NestJS API, Prisma schema and migrations, email templates
  frontend/      React application, routes, features and shared UI components
docs/
  user-stories/  Product backlog, coverage map and issue import tools
scripts/         Local environment setup
.github/         CI, deployment workflow and issue template
```

Backend features live in `apps/backend/src/modules`, with infrastructure in `src/core` and `src/shared`. Frontend routes live in `apps/frontend/src/routes`, features in `src/features`, and reusable controls in `src/components/ui`.

See the [backend README](apps/backend/README.md) and [frontend README](apps/frontend/README.md) for application-specific guidance.

## Run locally

Prerequisites: Node.js 24 (see [.nvmrc](.nvmrc)), pnpm 10.15.0 and Docker with Compose. Start Docker before running the application.

From the repository root:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` creates missing application environment files from their examples, starts PostgreSQL, applies migrations, runs the demo seed entry point and starts both development servers. Existing environment files are preserved.

| Service            | Address                                  |
| ------------------ | ---------------------------------------- |
| Frontend           | http://localhost:3050                    |
| API                | http://localhost:4050/api                |
| Swagger            | http://localhost:4050/api/docs           |
| Auth documentation | http://localhost:4050/api/auth/reference |

Local configuration lives in [apps/backend/.env.example](apps/backend/.env.example) and [apps/frontend/.env.example](apps/frontend/.env.example), copied to each application's `.env`. The root `.env` is used by the production Docker Compose stack, not by `pnpm dev`.

Email verification and password reset messages use the console mailer by default, so check the backend output for those messages. Resend and SMTP adapters are also available. Without a verified Resend domain, set `RESEND_API_KEY`, keep the sandbox `EMAIL_FROM` and set `EMAIL_ALLOWED_RECIPIENT` to the Resend account owner's address; mail to any other recipient is dropped with a warning.

Stop the development servers with `Ctrl+C`. Stop the local PostgreSQL container with:

```sh
pnpm dev:down
```

For testing an open PR, use [local QA preparation](docs/local-qa.md).

## Development commands

Run these commands from the repository root:

| Command                              | Purpose                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `pnpm check-all`                     | Generate Prisma; run automation tests, lint, type checks, unit tests, builds and formatting |
| `pnpm backend test`                  | Run backend tests with Jest                                                                 |
| `pnpm frontend test:ci`              | Run frontend tests with Vitest                                                              |
| `pnpm frontend type-check`           | Check frontend TypeScript types                                                             |
| `pnpm format`                        | Format repository and application files                                                     |
| `pnpm backend prisma:migrations:run` | Create and apply development migrations after schema changes                                |
| `pnpm backend prisma:studio`         | Open the database browser                                                                   |
| `pnpm backend seed`                  | Run the project seed entry point                                                            |
| `pnpm backend email:dev`             | Preview email templates                                                                     |

The test runners currently allow empty test suites. Passing checks alone does not demonstrate completion of the planned product workflows.

Read [AGENTS.md](AGENTS.md) for repository conventions and [DESIGN.md](DESIGN.md) before UI work. The design document is currently empty.

## Database

Local PostgreSQL runs on port **5433**, with `akcio` as the database name, username and local development password.

The initial migrations are intended for a fresh database. If reusing a database from the previous application, use a new database rather than applying this baseline to it. `pnpm backend db:reset` recreates a disposable development database and **deletes its data**.

## Deployment

The root Docker Compose stack runs PostgreSQL, the backend and the frontend:

```sh
cp .env.example .env
# Set deployment secrets, database credentials, BACKEND_URL and FRONTEND_URL.
docker compose up --build
```

Use [.env.example](.env.example) as the configuration reference. Replace placeholder secrets before deploying. The frontend API URL is embedded at build time, so changing `BACKEND_URL` requires rebuilding the frontend. Production startup applies migrations without seeding.

GitHub Actions includes [CI](.github/workflows/ci.yml) and a [course registry/Coolify deployment workflow](.github/workflows/deploy.yml). Configure repository secrets and deployment destinations before using the deployment workflow.

## License

akc.io is licensed under the [MIT license](LICENSE.txt).
