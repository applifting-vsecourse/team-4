---
name: akcio-fullstack
description: Build features in the akc.io monorepo (apps/frontend - React 19, Vite, TanStack Router/Query, Tailwind 4, shadcn/ui; apps/backend - NestJS 11, Prisma 7, PostgreSQL, BetterAuth). Use for any UI, route, API endpoint, DB schema or migration, e-mail template or sprint story (S2-xx) in this repo, and whenever a Figma wireframe has to become code.
---

# akc.io full-stack development

akc.io is a registration and payment platform for events and camps (organizers and participants). pnpm monorepo, Node 24, pnpm 10 (corepack). Product language is Czech; code and docs are English.

## Sources of truth, in this order

1. `docs/sprints/sprint-2/README.md` - current scope and PM decisions (Czech). Beats everything below it.
2. `docs/sprints/sprint-2/stories/s2-XX.md` and `delivery.md` (technical tasks T1-T6). Stories are marked **NÁVRH, not READY**.
3. Figma wireframes - layout and structure only. They lag the decisions above (see `references/figma-workflow.md`).
4. `docs/user-stories/` - the broader original backlog (F01-F62). Sprint 2 narrows it; do not build beyond the sprint story.

If the sources are silent on something that changes behaviour, stop and ask. Do not decide these ad hoc, they belong to the tech lead (`delivery.md` T1/T3): money representation, variable-symbol uniqueness, capacity concurrency, organization isolation, auth/magic-link design, e-mail provider setup.

## Ground rules (from CLAUDE.md, they override habit)

- The app is already running. Never start, restart or run `pnpm dev`. Do not open a browser unless asked. Evidence is type-check, lint, tests and build.
- Read `DESIGN.md` before changing any UI.
- Controls come from the shadcn kit. A missing control is added, never hand-rolled: `pnpm dlx shadcn@latest add <name> --cwd apps/frontend` (`components.json` lives in `apps/frontend`, not the repo root). Add it before building the screen that needs it.
- Use semantic tokens from `apps/frontend/src/styles/global.css` (`bg-background`, `text-muted-foreground`, ...). No hardcoded hex, no arbitrary Figma values.

## Per-story workflow

1. Read the story, its dependencies, the sprint README decisions and the relevant T-task.
2. Fix the API contract first: backend DTOs and Swagger, then the mirroring zod schema in the frontend feature.
3. Backend: follow `references/backend.md`.
4. Frontend: follow `references/frontend.md`. For each Figma link in the story follow `references/figma-workflow.md` (node IDs are in `references/figma-map.md`).
5. Write tests for behaviour that carries risk (capacity, money, access isolation, validation), not for markup.
6. Run the checks below for every app you touched.
7. Report: what changed, every deviation from the wireframe and why, open questions.

## Checks (run from repo root)

- Backend touched: `pnpm backend lint:check && pnpm backend test && pnpm backend build`
- Frontend touched: `pnpm frontend lint:check && pnpm frontend type-check && pnpm frontend test:ci && pnpm frontend build`
- Formatting: `pnpm format:check` (fix with `pnpm format`)
- Everything, same as CI: `pnpm check-all`
- Schema change: `pnpm backend prisma:migrations:run` (see `references/backend.md`)

## Non-negotiables from the sprint decisions

Verify against `docs/sprints/sprint-2/README.md` before relying on them.

- Currency is CZK. Every displayed time states the time zone Europe/Prague.
- An application is always saved, even when the term is full. Per term the outcome is confirmed or waitlisted ("náhradník"); both can occur in one application.
- A waitlisted term consumes no capacity and creates no debt. Debt comes only from confirmed terms, minus recorded payments.
- Capacity comes from beds per term. Concurrent applications for the last bed must never oversubscribe.
- One due date per application: moment of automatic confirmation plus the event's due-days setting.
- Organizations are isolated, including by direct API access. An organizer may own several organizations.
- Participant magic link: 15 minutes, single use; participant session 7 days. It must never log an organizer into organization management.
- Brand is "akc.io". Wireframes still say "Kemp.io" in places; do not copy that.

## Known gotchas

- Imports use the `@/` alias in both apps. Relative imports are allowed only for siblings (`./`); `../` is an ESLint error.
- This repo's existing example of a feature (`features/auth`) uses the BetterAuth client, not `ky`. There is no existing example of the `ky` + zod pattern yet; `references/frontend.md` shows the pattern the CLAUDE.md describes.
- `formatDate` in `apps/frontend/src/lib/date.ts` formats in the viewer's local zone and in a `dd-MM-yyyy` style. It does not satisfy the Europe/Prague rule; do not use it for user-facing times as is.
- Starter screens (login, signup, dashboard, header) are English placeholders. New UI copy is Czech, written inline; there is no i18n library, so ask before adding one.
- Do not edit `apps/frontend/src/routeTree.gen.ts` by hand; the TanStack router Vite plugin generates it, and the regenerated file is committed.
- Do not edit applied Prisma migrations. Do not edit BetterAuth tables by hand (see `references/backend.md`).
- CI installs with `--frozen-lockfile`: after adding a dependency commit `pnpm-lock.yaml`. Shared versions live in the `catalog:` entries of `pnpm-workspace.yaml`.
- `apps/backend/src/generated/` is generated and gitignored.

## Reference files (read when needed)

- `references/frontend.md` - structure, layering rules, data fetching, forms, routing, lint/format/test conventions
- `references/backend.md` - module anatomy, DTO rules, auth, Prisma workflow, email, config, tests
- `references/figma-workflow.md` - how to turn a wireframe into code with this repo's kit, token and component mapping
- `references/figma-map.md` - Figma node IDs and which story uses them
