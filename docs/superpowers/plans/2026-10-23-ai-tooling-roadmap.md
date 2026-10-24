# AI tooling and engineering practices: action plan

Snapshot of `main` at `f069f6b` (2026-10-23). Each item is a separate branch/PR
(one feature per branch). Items touching `.github/` or `scripts/delivery|agent-review`
need David's review (CODEOWNERS). Adding Storybook, Renovate or Playwright is a
tooling decision for the tech lead/PM, so raise it before starting.

## Current state

| Area         | What exists                                                                             | Gap                                                                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent rules  | `CLAUDE.md` + `AGENTS.md` (mutually include each other), `DESIGN.md`, `docs/sitemap.md` | Rules are prose; few are enforced mechanically                                                                                                                                                     |
| Skills       | `shadcn` vendored in `.claude/skills` + `skills-lock.json`                              | `akcio-fullstack` lives only in one user's `~/.claude/skills` and is stale (points at `docs/sprints/sprint-2/README.md` and `stories/`, which are no longer in Git; says no ky+zod example exists) |
| MCP          | `.mcp.json`: shadcn (`npx shadcn@latest`, unpinned), Figma (remote)                     | Figma is the only UI source for agents; no component catalogue MCP                                                                                                                                 |
| Hooks        | PostToolUse: ESLint on edited `apps/frontend/src/**/*.tsx`                              | No `.ts`, no backend, no guard on generated/vendored files                                                                                                                                         |
| Lint         | Strict FE ESLint (type-checked, a11y, feature boundaries, `@shadcn/lint`); BE ESLint    | 44 files in `SHADCN_LEGACY_FILES` with no burn-down mechanism                                                                                                                                      |
| Pre-commit   | husky + lint-staged (prettier + eslint --fix)                                           | No type-check, no Prisma regenerate after checkout                                                                                                                                                 |
| CI           | `ci.yml` (migrations, db-spec, gates, format, lint, type-check, tests, builds)          | No dependency updates, no audit/secret/CodeQL scanning, no coverage report, no e2e                                                                                                                 |
| Agent review | Copilot CLI reviews linked PRs against `CLAUDE.md`, `DESIGN.md`, `ci.yml`               | UI rules in `AGENTS.md` are not in the review context                                                                                                                                              |
| Delivery     | `deploy.yml` on every push to main; `release.yml` after green CI                        | **Deploy does not wait for CI**                                                                                                                                                                    |

### Tests (measured 2026-10-23)

- Frontend: 30 files / 180 tests, all pass (Vitest + RTL, jsdom). ~93 non-UI components, ~23 with tests. No coverage tooling installed.
- Backend unit: 10 suites / 87 tests, pass. Line coverage **11%** (db-specs not counted). `pnpm backend test` fails on a fresh checkout until `prisma generate` runs (stale client after branch switch).
- Backend DB: 10 `*.db-spec.ts` suites against real Postgres (registrations, isolation, payments, participant access). Run in CI only; need Postgres on `:5433` locally.
- No end-to-end tests, no visual tests, no contract test between Swagger DTOs and frontend zod schemas.

## P0: correctness and security (do first, small)

1. **Gate deploy on CI.** Change `deploy.yml` trigger to `workflow_run: [CI] completed, branches: [main]` with `if: conclusion == 'success' && event == 'push'` (same pattern as `release.yml`). Today a red main still ships.
2. **Stop baking `RESEND_API_KEY` into the image.** `apps/backend/Dockerfile.deploy:68-69` turns the build-arg into `ENV`; anyone who can pull the image reads it from layer history. Move it (and `EMAIL_ALLOWED_RECIPIENT`) to Coolify runtime env; drop the build-args from `deploy.yml`. Rotate the key afterwards.
3. **`pretest` regenerates Prisma** in `apps/backend/package.json` (`"pretest": "prisma generate"`) and a husky `post-checkout`/`post-merge` hook that runs it when `apps/backend/prisma/schema.prisma` changed. Removes the most common "tests fail after switching branch" error documented in `docs/local-qa.md`.
4. **Put `AGENTS.md` in the agent review context** (`scripts/agent-review/run.mjs:276`), otherwise shadcn/token rules are never reviewed.

## P1: automate the basic loop for agents

5. **Move `akcio-fullstack` into the repo** as `.claude/skills/akcio-fullstack/` and fix it: sources of truth = GitHub issue + `docs/sitemap.md` + `docs/sprints/*/story-index.md`; remove dead paths; replace the "no ky+zod example" gotcha with a pointer to `features/registrations/api/`. Pin it in `skills-lock.json` style or just commit it.
6. **Project skills (slash commands) for repeated tasks** in `.claude/skills/`:
   - `/story <issue>`: `gh issue view`, read sitemap + sprint index, print access area / route / data scope, create `feature/<sprint>-<id>-<slug>` branch.
   - `/feature-scaffold <name>`: create `features/<name>/{api,hooks,components,fixtures}` with schema, query options, fixture and stories stubs (see previews plan).
   - `/handoff`: run `pnpm check-all`, then open a concise PR with `Closes #N` (rules from CLAUDE.md "PRs handling").
   - `/qa <PR>`: wraps `gh pr checkout` + `pnpm qa:prepare <sha>`.
7. **Turn prose rules into hooks** (`.claude/settings.json`):
   - PreToolUse on Edit/Write: block `routeTree.gen.ts`, `apps/backend/src/generated/**`, existing `prisma/migrations/*/migration.sql`, `src/components/ui/**` and `eslint.config.js` (AGENTS.md says ask first) with a message telling the agent to ask.
   - Extend the lint hook to `apps/frontend/src/**/*.ts` and `apps/backend/src/**/*.ts`.
   - Shared `permissions.allow` for `pnpm check`, `pnpm check-all`, `pnpm frontend test:ci`, `pnpm backend test`, `gh issue view`, `gh pr view` (run `/fewer-permission-prompts` to seed it).
8. **Pin MCP servers**: `shadcn@<exact>` instead of `@latest`. Add Storybook MCP once previews land (previews plan, Task 5).
9. **Lint ratchet for legacy files**: a `node --test` check that `SHADCN_LEGACY_FILES.length` never grows (store the count; lower it when a file is fixed). Needs developer approval because it touches lint config.

## P1: tests and contracts

10. **Coverage visibility, no thresholds yet.** Add `@vitest/coverage-v8`, `test:cov` script, and in CI run backend `test:cov` + `test:db --coverage` and upload the reports as artifacts. Set thresholds only after a baseline is agreed.
11. **API contract check.** Backend writes the Swagger document to `apps/backend/openapi.json` (small script using `SwaggerModule.createDocument`); CI fails if it differs from the committed file. Next step: generate frontend zod schemas from it (e.g. `orval` zod output or `@hey-api/openapi-ts`) instead of hand-mirroring DTOs, which removes a whole class of agent mistakes.
12. **E2E smoke (Playwright)** for the money path only: organizer signs in → event with term and room → public registration → registration list → record payment; participant magic link with the email captured by a test email transport. Runs in CI against the CI Postgres service. Separate plan when approved.
13. **Component previews as tests**: see `2026-10-23-component-previews.md`. Every story becomes a render + a11y test.

## P2: missing engineering practices

14. **Dependency updates**: Renovate (grouped weekly, pnpm catalog aware) or Dependabot. `pnpm audit --prod --audit-level high` step in CI.
15. **Security scanning**: CodeQL (JS/TS) and gitleaks secret scan on PRs.
16. **PR template** (`.github/pull_request_template.md`): `Closes #`, what changed, how to test, stories link. The delivery bot already parses `Closes #N`.
17. **ADRs**: `docs/adr/NNNN-*.md` for the tech-lead decisions now scattered in sprint docs (money representation, capacity concurrency, org isolation, magic link). Agents read them instead of guessing.
18. **Runtime observability**: health endpoint used by Coolify, structured logs, error tracking (Sentry free tier) for frontend and backend.
19. **Resolve the `CLAUDE.md` ↔ `AGENTS.md` loop**: one canonical file (AGENTS.md, read by Copilot/Codex too) and `CLAUDE.md` = `@AGENTS.md` + Claude-only notes.

## Figma → Preview-first UI

Possible in this stack. Storybook 10.6 supports Vite 8 + React 19, its Vitest addon runs every story as a browser test on the Vitest 4 already in use, and `@storybook/addon-mcp` gives agents the component/story catalogue the way the Figma MCP gives them frames today. Mapping and the pilot are in `2026-10-23-component-previews.md`. Figma stays the source for tokens (Design system library) and rough layout; the reviewed artifact for a screen becomes its stories.
