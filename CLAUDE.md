# Agent instructions

akc.io is an event management product, developed as a pnpm monorepo with two apps.

- `apps/backend` — NestJS + Prisma + Postgres. Auth: BetterAuth (mounted at `/api/auth/*`, treat as a black box). API docs: Swagger at `/api/docs`.
- `apps/frontend` — React + Vite + TanStack Router/Query, Tailwind + shadcn/ui, `ky` + `zod` API client. Feature folders under `src/features/`.

Organize backend features into controllers, DTOs, services, domain models and repositories. Organize frontend features into API schemas, query options, hooks and components. Keep shared infrastructure outside feature folders.

**Before writing or changing any UI, read [`DESIGN.md`](DESIGN.md).** It is the akc.io design system: tokens, components and how to add them (#79).

## Sitemap and story context

Before implementing a story, read [the sitemap](docs/sitemap.md), the GitHub issue and its sprint decisions. Identify the access area (public, participant, organization or event), data scope, existing destination and entry/exit paths before choosing routes or adding screens. The sitemap describes the target structure; the story defines the implementation scope. Do not implement deferred branches just because they appear in the map.

Reuse the relevant existing page. Report conflicts or proposed structural changes to the PM before changing the navigation structure. Keep the FigJam source, text sitemap and story navigation context aligned for explicitly authorized changes; follow the ownership and maintenance rules in the sitemap. GitHub issue titles and bodies are the single source of truth for user stories, including navigation context. Local Markdown copies are private PM working material, ignored by Git; they are not required for implementation and must not override the issue.

## Commands

- `pnpm dev` — everything: env files, Postgres (Docker), migrate, run the seed entry point, both dev servers
- `pnpm check-all` — lint + type-check + tests + build (CI also validates migrations and database constraints)
- `pnpm backend test` / `pnpm frontend test:ci` — unit tests
- `pnpm backend prisma:migrations:run` — create/apply migrations after schema changes

## Product identity and compatibility

Use `akc.io` as the product name in UI, emails, API metadata and documentation; use `akcio` where a technical identifier cannot contain a dot. This repository implements akc.io and is not a reusable starter.

Every page must display the akc.io icon and wordmark together in its header or dashboard sidebar. Reuse the shared `BrandMark` component (`apps/frontend/src/components/BrandMark.tsx`), including in previews; do not replace the logo with plain text or a generic icon. Keep icon size and spacing relative to the wordmark font size so their proportions scale together, and prevent the icon from shrinking or the wordmark from wrapping.

Do not retain or introduce backward compatibility for previous product names, starter behavior or superseded internal contracts. Remove obsolete aliases, shims, fallback branches and transitional code when replacing them; update all affected callers and configuration to the current contract. Do not rename external resources without verifying their actual identity.

## Conventions

Deliberately sparse — this file grows as the team learns what it expects from generated code. Add rules here when you find yourself repeating the same review feedback.

### User stories are owned by the PM

User stories are read-only for agents by default. Only David, acting as PM, may explicitly authorize an agent to create, edit, delete, regenerate, import or synchronize user stories. A request to implement a story, fix code, update documentation or complete a feature is not authorization to change the story.

This rule covers private local stories in `docs/user-stories/` and `docs/sprints/*/stories/`, their requirements, acceptance criteria, scope, priorities and approval metadata, the source feature workbook, and corresponding GitHub issue titles and bodies. Do not run `docs/user-stories/import.py --execute` without explicit PM authorization, because it writes story content to GitHub.

If implementation reveals a gap or conflict, report it to the PM and propose a change in your response; leave the story unchanged. When the PM explicitly requests story changes, make only the authorized changes. Reading stories and reporting implementation progress remain allowed.

### UI rules

Frontend stack (`apps/frontend`): Vite + React 19, Tailwind v4, shadcn/ui, TypeScript.

- Before building UI, look up existing components through the shadcn MCP or `pnpm dlx shadcn@latest docs <component>`. Add missing ones from `apps/frontend` with `pnpm dlx shadcn@latest add <name>`. Never hand-roll a primitive shadcn provides. In this monorepo, shadcn CLI commands run from the root need `-c apps/frontend`.
- A freshly added `src/components/ui` file can fail the token rules (upstream arbitrary values). Report those findings to the developer instead of editing the file or the lint config.
- Semantic tokens only (`bg-background`, `text-muted-foreground`, `bg-destructive`, …). No raw palette colors, arbitrary values (`p-[13px]`) or inline styles.
- Pages control layout only. Appearance comes from component variants and sizes; if none fits, ask instead of restyling with `className`.
- Do not, without asking the developer: add theme tokens, add lint-disable comments, edit the lint config (including `SHADCN_LEGACY_FILES`), or edit `src/components/ui` just to make a violation go away.
- After any UI change, run `pnpm check` and fix every error before finishing. `pnpm check-all` still gates handoff.

### UI controls come from the kit

Need a control that isn't in `src/components/ui/`? Add it with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one in a feature folder, even where a native input would do the job. One accessibility implementation to reason about beats a per-control judgement call.

Use semantic tokens from `apps/frontend/src/styles/global.css` and follow the project requirements in `DESIGN.md`.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative.

### Run `pnpm check-all` before handing work back

Before you hand work to the developer (report it done, commit, push or open a PR), run `pnpm check-all` from the repo root and fix every failure. CI additionally validates migrations and database constraints. Running single checks or Prettier from the root is not enough, because each app has its own Prettier config.

### Delivery gates

Never commit or push changes directly to `main`. All changes to `main` must go
through a pull request from another branch, including documentation and configuration changes.

PR severity is selected by `severity:low`, `severity:standard` or `severity:high`;
unlabelled PRs default to Standard. Mixed/unknown severity labels block delivery.
Low requires CI but skips linked issues, requirements approval, code review and
QA. It is limited to documentation/text and isolated test files; executable or
configuration changes cannot use Low. Enforcement changes always require High.
Standard requires `Closes #N`, independent Copilot review and current-commit QA,
without requirements approval. High additionally requires issue-level scope
approval from David (`darebakdavca`) or Bogdan (`rmnskb`) before code review, with
no PR-author exemption. Either may approve via a linked PR review or an explicit
`/requirements-approve` issue comment. Collaborators may request fresh scope review
with `/requirements-rereview`. Requirement/title changes invalidate scope approval;
checkbox and `Evidence dokončení` updates do not. Implementation commits preserve
unchanged scope approval but require fresh code review and QA.

`MatejKrones` approves QA after the testing handoff; on Matej's PRs, David performs
QA. Request QA only after independent review passes and the current commit enters
Ready for Testing. Low PRs receive no automated QA request. CODEOWNERS routes
David/Bogdan enforcement-path requests; code-owner approval is disabled. GitHub's
blanket approval count is zero after severity installation; Delivery stages
enforces the named approvals. See [the delivery workflow](docs/delivery-workflow.md).
Only `darebakdavca` may waive Copilot review with a standalone PR comment
`/copilot-waive <full-current-SHA> <reason>`. A waiver replaces only Copilot review
for that PR commit; CI and severity-specific requirements/QA still apply. Preserve
findings and record a manual waiver, never a fabricated Copilot pass. A new
commit needs a new waiver or review; recheck edited/deleted commands.
Never manufacture passing gate evidence or bypass merge protection.

### PRs handling

When a user asks to open a PR on their behalf, be concise in the body text as if it was written by human.

Always reference the item that you've worked on, example: "Closes #XX".
