# Agent instructions

akc.io is an event management product, developed as a pnpm monorepo with two apps.

- `apps/backend` — NestJS + Prisma + Postgres. Auth: BetterAuth (mounted at `/api/auth/*`, treat as a black box). API docs: Swagger at `/api/docs`.
- `apps/frontend` — React + Vite + TanStack Router/Query, Tailwind + shadcn/ui, `ky` + `zod` API client. Feature folders under `src/features/`.

Organize backend features into controllers, DTOs, services, domain models and repositories. Organize frontend features into API schemas, query options, hooks and components. Keep shared infrastructure outside feature folders.

**Before writing or changing any UI, read [`DESIGN.md`](DESIGN.md).** It is the akc.io design system: tokens, components and how to add them (#79).

## Story context

Before implementing a story, read the GitHub issue and its sprint decisions. Identify the access area (public, participant, organization or event), data scope, existing destination and entry/exit paths before choosing routes or adding screens. The story defines the implementation scope.

Reuse the relevant existing page. Report conflicts or proposed structural changes to the PM before changing the navigation structure. GitHub issue titles and bodies are the single source of truth for user stories, including navigation context. Local Markdown copies are private PM working material, ignored by Git; they are not required for implementation and must not override the issue.

## Commands

- `pnpm dev` — everything: env files, Postgres (Docker), migrate, run the seed entry point, both dev servers
- `pnpm storybook` — launch the frontend Storybook on port 6006
- `pnpm check-all` — lint + type-check + unit tests + build (CI also validates migrations and database constraints)
- `pnpm check-stories` — story tests in Chromium + Storybook build; once at the end of UI work, not after every change
- `pnpm backend test` / `pnpm frontend test:ci` — unit tests
- `pnpm backend prisma:migrations:run` — create/apply migrations after schema changes

## Product identity and compatibility

Use `akc.io` as the product name in UI, emails, API metadata and documentation; use `akcio` where a technical identifier cannot contain a dot. This repository implements akc.io and is not a reusable starter.

Every page must display the akc.io icon and wordmark together in its header or dashboard sidebar. Reuse the shared `BrandMark` component (`apps/frontend/src/components/BrandMark.tsx`), including in previews; do not replace the logo with plain text or a generic icon. Keep icon size and spacing relative to the wordmark font size so their proportions scale together, and prevent the icon from shrinking or the wordmark from wrapping.

Do not retain or introduce backward compatibility for previous product names, starter behavior or superseded internal contracts. Remove obsolete aliases, shims, fallback branches and transitional code when replacing them; update all affected callers and configuration to the current contract. Do not rename external resources without verifying their actual identity.

## Conventions

Deliberately sparse — this file grows as the team learns what it expects from generated code. Add rules here when you find yourself repeating the same review feedback.

### Sync with main before starting an issue

Before starting work on any issue, fetch the latest `origin/main` and merge it into the issue's working branch. Create new issue branches from the latest `origin/main`. Resolve any merge conflicts before implementation so the work uses the current shared UI, components and application behavior. Preserve unrelated local changes; do not discard them to make the merge possible. If they prevent a safe merge, report the blocker before starting implementation.

### User stories are owned by the PM

User stories are read-only for agents by default. Only David, acting as PM, may explicitly authorize an agent to create, edit, delete, regenerate, import or synchronize user stories. A request to implement a story, fix code, update documentation or complete a feature is not authorization to change the story.

This rule covers private local stories in `docs/user-stories/` and `docs/sprints/*/stories/`, their requirements, acceptance criteria, scope, priorities and approval metadata, the source feature workbook, and corresponding GitHub issue titles and bodies. Do not run `docs/user-stories/import.py --execute` without explicit PM authorization, because it writes story content to GitHub.

If implementation reveals a gap or conflict, report it to the PM and propose a change in your response; leave the story unchanged. When the PM explicitly requests story changes, make only the authorized changes. Reading stories and reporting implementation progress remain allowed.

### Issue structure and backlog refinement

When the PM authorizes story creation or refinement, keep issues concise and use these sections:

- `User story` — who needs what and why.
- `Akceptační kritéria` — observable, verifiable completion conditions, including relevant empty and error states.
- `Podklady` — required for UI stories; may initially be empty. After the issue enters Sprint Backlog, the UX designer adds the Storybook entry names for the proposed screens and relevant states (for example, `Designs / F11-1 Room capacity`). UI implementation starts only once the necessary design references are available on that story.
- `Mimo rozsah` — include only when needed to clarify boundaries.

Keep navigation context to a concrete destination where needed (for example, `Umístění: správa akce → Pokoje`). Shared background and source materials can remain on the parent issue; Storybook entry names for the specific UI belong on the implementing story. Keep the GitHub issue template short; workflow instructions belong here rather than in template comments. Resolve outstanding product decisions with the PM before dependent implementation and incorporate the agreed behavior into the acceptance criteria. Do not add an `Otevřené otázky` section. Avoid provenance prose, duplicate status information and separate `Stav refinementu` sections. Track status and sprint assignment in GitHub Projects.

Select existing product backlog issues for a sprint directly when their whole scope fits; do not create sprint-specific copies. When a broader requirement needs splitting, retain it as a parent issue and use GitHub's native parent/sub-issue relationship for independently acceptable product outcomes. Preserve deferred acceptance criteria in open sub-issues in Product Backlog without a sprint. Assign selected sub-issues to the sprint; keep the parent open without a sprint until its full retained scope is delivered and accepted. Do not duplicate relationship links or explanatory comments manually. A completed sprint slice does not complete its broader parent; removing a requirement requires an explicit PM decision.

### UI rules

Frontend stack (`apps/frontend`): Vite + React 19, Tailwind v4, shadcn/ui, TypeScript.

- Before building UI, look up existing components through the shadcn MCP or `pnpm dlx shadcn@latest docs <component>`. Add missing ones from `apps/frontend` with `pnpm dlx shadcn@latest add <name>`. Never hand-roll a primitive shadcn provides. In this monorepo, shadcn CLI commands run from the root need `-c apps/frontend`.
- A freshly added `src/components/ui` file can fail the token rules (upstream arbitrary values). Report those findings to the developer instead of editing the file or the lint config.
- Semantic tokens only (`bg-background`, `text-muted-foreground`, `bg-destructive`, …). No raw palette colors, arbitrary values (`p-[13px]`) or inline styles.
- Pages control layout only. Appearance comes from component variants and sizes; if none fits, ask instead of restyling with `className`.
- Do not, without asking the developer: add theme tokens, add lint-disable comments, edit the lint config (including `SHADCN_LEGACY_FILES`), or edit `src/components/ui` just to make a violation go away.
- Every screen has a light desktop preview in Storybook (`pnpm storybook`). Its data comes from fixtures parsed with the feature's zod schemas and served through MSW; an API request without a handler fails instead of reaching the backend. `pnpm frontend test:stories` renders every story in Chromium with its `play` checks and the accessibility check; it is the evidence for UI work, and agents run it through the Storybook MCP server too. While iterating, run only the affected file (`pnpm frontend test:stories <path>`).
- After any UI change, run `pnpm check` and fix every error before finishing. `pnpm check-all` still gates handoff; UI work additionally runs `pnpm check-stories` once, at the end.

### Storybook UI handoff

- For UI-preparation work, create an isolated Storybook preview using existing design-system components and mocked data. Show the relevant states and interactions without wiring the preview into a product route, API or persistence.
- Before implementing UI, read the issue and its `Podklady` Storybook entry names, then launch Storybook with `pnpm storybook`. The issue's acceptance criteria define behavior; the approved Storybook stories define the visual reference and the states to implement.
- Do not start UI implementation when required Storybook references are missing, unapproved or conflict with the issue. Report the gap or conflict to the PM instead of guessing or expanding scope.
- Reuse or adapt suitable preview components during implementation. Keep stories aligned with the implemented components and their relevant states so the UI is not maintained twice.
- Issue titles, bodies and approval metadata are PM-owned. Add or change Storybook entry names or change issue status only with the PM's explicit authorization; otherwise hand the reference name to the PM to add.

### UI controls come from the kit

Need a control that isn't in `src/components/ui/`? Add it with `pnpm dlx shadcn@latest add <name>` — don't hand-roll one in a feature folder, even where a native input would do the job. One accessibility implementation to reason about beats a per-control judgement call.

Use semantic tokens from `apps/frontend/src/styles/global.css` and follow the project requirements in `DESIGN.md`.

### The app is already running

Assume the dev servers are up. If something is listening on the app's ports, that is this application: use it. Don't start a second instance, don't restart it, don't run `pnpm dev`.

Don't reach for the browser to check your own work. Tests and type-checks are the evidence; open the running app when asked to, not on your own initiative.

### Run `pnpm check-all` before handing work back

Before you hand work to the developer (report it done, commit, push or open a PR), run `pnpm check-all` from the repo root and fix every failure. If you changed UI, stories or their fixtures, also run `pnpm check-stories` once at that point. CI additionally validates migrations and database constraints. Running single checks or Prettier from the root is not enough, because each app has its own Prettier config.

### Delivery gates

Never commit or push changes directly to `main`. All changes to `main` must go
through a pull request from another branch, including documentation and configuration changes.

PR severity is selected by `severity:low`, `severity:standard` or `severity:high`;
unlabelled PRs default to Standard. Mixed/unknown severity labels block delivery.
Low requires CI but skips linked issues, requirements approval, code review and
QA. It is limited to documentation/text and isolated test files; executable or
configuration changes cannot use Low. Enforcement changes always require High.
Standard requires an issue link (`Closes #N` for completed work or `Refs #N` for
partial work), independent Copilot review and current-commit QA, without
requirements approval. An isolated Storybook design-preview PR marked
`design:storybook-preview` replaces separate QA with current-commit PM approval;
see the [delivery workflow](docs/delivery-workflow.md) for its scope and rules.
High additionally requires issue-level scope approval
from David (`darebakdavca`) or Bogdan (`rmnskb`) before code review, with no
PR-author exemption. Either may approve via a linked PR review or an explicit
`/requirements-approve` issue or linked PR comment. PR commands approve linked
issues and are recorded on those issues. Collaborators may request fresh scope review
with `/requirements-rereview`. Requirement/title changes invalidate scope approval;
checkbox and `Evidence dokončení` updates do not. Implementation commits preserve
unchanged scope approval but require fresh code review and QA.

`MatejKrones` approves QA after the testing handoff; on Matej's PRs, David performs
QA. Request QA only after independent review passes and the current commit enters
Ready for Testing, except for approved Storybook design-preview PRs. Low PRs
receive no automated QA request. CODEOWNERS routes
David enforcement-path requests; code-owner approval is disabled. GitHub's
blanket approval count is zero after severity installation; Delivery stages
enforces the named approvals. See [the delivery workflow](docs/delivery-workflow.md).
Only `darebakdavca` may waive Copilot review with a standalone PR comment
`/copilot-waive <full-current-SHA> <reason>`. A waiver replaces only Copilot review
for that PR commit; CI and severity-specific requirements/QA still apply. Preserve
findings and record a manual waiver, never a fabricated Copilot pass. A new
commit needs a new waiver or review; recheck edited/deleted commands.
Never manufacture passing gate evidence or bypass merge protection.

### PRs handling

Use `.github/pull_request_template.md` as the starting point for PR descriptions. Keep the body concise and written for a reviewer who has not seen the conversation:

- `What`: describe the concrete problem and resulting behavior in one or two sentences; scale detail to the change.
- `Why`: link the story or issue. Use `Closes #N` only when the PR completes that issue; use `Refs #N` for partial work or a broader parent that remains open.
- `How to test`: include actionable reviewer steps when useful. Do not fill this section with agent verification logs, routine successful checks (`pnpm check-all`, formatting, link checks, `git diff --check`) or file inventories. CI reports routine automated results; mention failures or verification limitations only when they affect the review.
- `Screenshots`: include relevant visuals for UI changes when available; do not fabricate evidence.

Code reviews must evaluate the PR's declared scope as well as its linked story. Treat the PR title and `What`/`Why` sections as the author's description of the slice being delivered, and use the issue for product context and relevant criteria. `Refs #N` explicitly means partial work: missing behavior that the PR says is deferred is not a blocker just because the broader issue requires it. `Closes #N` claims completion, so review the full issue scope. For either link type, block concrete regressions and defects in behavior the PR claims to deliver; do not infer that an inert or mocked design preview must persist data or call a backend when the PR explicitly says implementation comes later. If the PR's declared scope conflicts with the issue or is too vague to review, report the conflict as a note or ask the author to clarify instead of silently expanding the PR's scope.

Keep the template headings (`What`, `Why`, `How to test`, `Screenshots`), including for small documentation PRs. Keep each section brief; where a section does not apply, state that concisely rather than removing the heading. Remove template comments. Describe the final scope, without conversational history or abandoned approaches. Continue running all required checks before handoff; keeping their routine results out of the PR body does not waive validation.
