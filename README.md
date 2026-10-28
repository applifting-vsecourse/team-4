# akc.io

Event management platform developed by **Team 4 for VŠE 4IT580**. Organizers prepare events, collect registrations and track payments; participants register from a phone and access their registrations through an email magic link.

**[Open the deployed application](https://team-4.vsepractical.applifting.dev)** · **[Product backlog](https://github.com/applifting-vsecourse/team-4/issues)** · **[Pull requests and reviews](https://github.com/applifting-vsecourse/team-4/pulls?q=is%3Apr)** · **[CI runs](https://github.com/applifting-vsecourse/team-4/actions/workflows/ci.yml)**

## What to evaluate

The implemented core journey covers organizer sign-up, organization and event creation, dates with prices and capacities, room setup, opening registration, participant registration, payment instructions, manual payment recording and participant self-service. The [guided Sprint Review demo](docs/sprint-review-2.md) connects this journey to its user stories and shows the organizer on desktop and participant on mobile.

The wider backlog also includes accommodation allocation, waiting lists, bank imports and cancellation workflows. These are planned scope, not a claim that every feature is complete. **GitHub issues and their acceptance criteria are the source of truth** for scope and delivery status; the [sitemap](docs/sitemap.md) describes the target navigation.

## Engineering and delivery

| Practice                       | How it works / evidence                                                                                                                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Traceable delivery**         | Standard and High PRs link their user stories with `Closes #N`. Automation moves linked issues through code review and testing, retaining review findings and QA handoffs.                                                                                                   |
| **Independent code review**    | Copilot reviews Standard and High PRs against the issue scope. New commits require fresh review; a recorded, commit-specific manual waiver is available to the designated maintainer.                                                                                        |
| **Human acceptance testing**   | A designated teammate tests the exact PR commit after the review handoff. New commits require fresh QA, preventing approval of an older version from accepting changed code.                                                                                                 |
| **Risk-based merge gates**     | Standard requires CI, an issue link, independent review and human QA. High additionally requires product scope approval. Low is limited to documentation/text and isolated tests and still requires CI. Enforcement changes require High.                                    |
| **Automated verification**     | CI runs lint, formatting, type checks, unit tests, builds, migrations against a clean PostgreSQL database, database constraint tests and Playwright end-to-end tests. Playwright reports are uploaded as artifacts. The delivery automation itself also has automated tests. |
| **Deployment and releases**    | Pushes to `main` build Docker images and deploy the course stage through Coolify. Successful CI on `main` triggers a versioned GitHub Release with linked delivered issues.                                                                                                  |
| **Shared UI and architecture** | A documented Figma-backed design system, semantic tokens and reusable shadcn/ui controls support consistent responsive screens. Backend modules separate HTTP, business rules and persistence; frontend features separate API schemas, queries and components.               |

See [review, QA and merge policy](docs/delivery-workflow.md), [automated code review](docs/agent-code-review.md), [local PR testing](docs/local-qa.md) and [release history](https://github.com/applifting-vsecourse/team-4/releases) for details and evidence. Workflow definitions live in [.github/workflows](.github/workflows).

## Technology

| Area     | Stack                                                                           |
| -------- | ------------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, TanStack Router/Query, Tailwind CSS, shadcn/ui, Zod |
| Backend  | NestJS, Prisma, PostgreSQL, BetterAuth, Swagger, React Email                    |
| Testing  | Jest, Vitest, Playwright, database integration tests                            |
| Delivery | pnpm monorepo, GitHub Actions, Docker, Coolify                                  |

```text
apps/backend/   API modules, database schema/migrations and email templates
apps/frontend/ Routes, feature components, shared UI and end-to-end tests
scripts/       Review gates, QA preparation, releases and local setup
docs/          Architecture, navigation, delivery policy and demo guides
```

Architecture: [data model](docs/architecture/data-model.md) · [design system](DESIGN.md) · [backend guide](apps/backend/README.md) · [frontend guide](apps/frontend/README.md).

## Run locally

Prerequisites: **Node.js 24**, **pnpm 10.15.0** and **Docker with Compose** running.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` creates missing environment files, starts PostgreSQL, applies migrations, runs the seed entry point and starts both apps. Existing environment files are preserved. See the [backend](apps/backend/.env.example) and [frontend](apps/frontend/.env.example) environment examples for configuration. The default console mailer prints emails, including access links, in the backend output.

| Service                   | Local address                  |
| ------------------------- | ------------------------------ |
| Application               | http://localhost:3050          |
| API                       | http://localhost:4050/api      |
| Swagger API documentation | http://localhost:4050/api/docs |

Stop servers with `Ctrl+C`; stop the database with `pnpm dev:down`.

## Verify and demonstrate

```sh
pnpm check-all                  # Local checks: automation, lint, types, unit tests, builds, formatting
pnpm frontend test:e2e          # Playwright end-to-end tests
pnpm frontend demo:v2           # Guided organizer + mobile participant demonstration
```

CI additionally applies migrations to a clean database and runs database constraint tests. See the [demo guide](docs/sprint-review-2.md) for controls and remote email setup. The demo creates persistent application data.

The [course deployment](https://team-4.vsepractical.applifting.dev) is a shared staging environment. Deployment configuration and version redeployment instructions are documented in the [delivery workflow](docs/delivery-workflow.md#releases-and-the-stage).

## License

[MIT](LICENSE.txt).
