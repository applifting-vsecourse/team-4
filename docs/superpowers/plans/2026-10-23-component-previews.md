# Component Previews (Preview-first UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `apps/frontend` a Compose-`@Preview`-style workflow: every screen state is a colocated story rendered from typed fixtures, runs as a browser test, and is readable by agents over MCP, so dummy UI is built and reviewed before it is wired to the API.

**Architecture:** Storybook 10 (`@storybook/react-vite`) reuses the app's Vite config. Global decorators supply what `src/app/Providers.tsx` supplies in the app (fresh QueryClient, theme, tooltip, a memory TanStack router). Fixtures are built through the feature's zod schemas so they cannot drift from the API contract; components that fetch get their data from MSW handlers. `@storybook/addon-vitest` runs every story as a Vitest browser test (Playwright Chromium) with `@storybook/addon-a11y` checks; `@storybook/addon-mcp` exposes the catalogue to agents.

**Tech Stack:** Storybook 10.6, Vitest 4 browser mode + Playwright, MSW 2 + msw-storybook-addon 3, React 19, Vite 8, TanStack Router/Query, Tailwind 4.

**Spec:** `docs/superpowers/plans/2026-10-23-ai-tooling-roadmap.md` (section "Figma → Preview-first UI"), `DESIGN.md`, `AGENTS.md` "UI rules".

## Compose → this stack

| Compose                      | Here                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `@Preview fun Foo()`         | `export const Filled: Story` in `Foo.stories.tsx` next to `Foo.tsx`           |
| `@Preview(uiMode = NIGHT)`   | `globals: { theme: "dark" }` on the story                                     |
| `@Preview(widthDp = 360)`    | `globals: { viewport: { value: "mobile360" } }`                               |
| `PreviewParameterProvider`   | `args` built by fixture factories (`features/<f>/fixtures/*.ts`)              |
| IDE preview pane             | `pnpm frontend storybook` (port 6006) beside the editor                       |
| Paparazzi / screenshot tests | `pnpm frontend test:stories` (render + play + a11y); pixel snapshots deferred |

## Global Constraints

- Approval first: adding Storybook/MSW/Playwright dependencies is a tech-lead decision; changes under `.github/` need David's review (CODEOWNERS).
- Do not edit `src/components/ui/**`, `eslint.config.js` or theme tokens (AGENTS.md); report lint findings in vendored files instead.
- Semantic tokens only; stories control layout only, no `className` restyling (AGENTS.md).
- Every page-level story shows `BrandMark` where the real page does (CLAUDE.md); never a text placeholder.
- Czech UI copy in fixtures; CZK amounts; times in Europe/Prague (DESIGN.md).
- Fixtures live in the feature folder and import only from that feature and shared code (`import/no-restricted-paths`).
- `mockServiceWorker.js` must not ship in the production `build/` output.
- Exact versions: `storybook`, `@storybook/react-vite`, `@storybook/addon-vitest`, `@storybook/addon-a11y`, `@storybook/addon-mcp` all `10.6.3`; `msw-storybook-addon` `3.0.3`; Playwright and `@vitest/browser-playwright` matching the installed `vitest` major (4).
- `pnpm check-all` passes before handoff and includes the story tests.

## Review Focus

1. Storybook's Vite build inherits `TanStackRouterVite` and `vite-plugin-checker` from `vite.config.ts`: the router plugin must not rewrite `src/routeTree.gen.ts`, and checker must not run inside Storybook. Pinned by Task 1 Step 4 (`git diff --exit-code src/routeTree.gen.ts` after a Storybook build).
2. Components with `<Link>`/`useNavigate` crash without a router context. Pinned by Task 2 (story for `BackToEventsButton`, which renders a link).
3. The app's global `queryClient` (imported by `api-client.ts`) leaking cache between stories so one story shows another's data. Pinned by Task 2: decorator creates a new `QueryClient` per story with `retry: false`; Task 4 Empty and Filled stories run in the same file.
4. Dark theme not applied because next-themes-style `.dark` class is set on `<html>`, not the story root. Pinned by Task 2 story test asserting `document.documentElement.classList.contains("dark")` for `globals.theme = "dark"`.
5. Fixtures drifting from the API contract. Pinned by Task 4 unit test parsing every fixture with its zod schema.

---

### Task 1: Storybook boots on the app's Vite config

**Files:**

- Create: `apps/frontend/.storybook/main.ts`, `apps/frontend/.storybook/preview.tsx`
- Create: `apps/frontend/src/components/BrandMark.stories.tsx`
- Modify: `apps/frontend/package.json` (scripts, devDependencies), `apps/frontend/tsconfig.json` (`include` adds `.storybook/**/*.ts`, `.storybook/**/*.tsx`), `.gitignore` and `.prettierignore` (`apps/frontend/storybook-static`)

**Interfaces:**

- Produces: scripts `storybook` = `storybook dev -p 6006 --no-open`, `build-storybook` = `storybook build -o storybook-static`; `preview.tsx` default export `preview: Preview` that later tasks extend with `decorators`, `globalTypes`, `loaders`.

- [ ] **Step 1:** From `apps/frontend`, add `storybook@10.6.3 @storybook/react-vite@10.6.3` as devDependencies (do not run `storybook init`; it writes example stories and edits configs).
- [ ] **Step 2:** `main.ts`: `framework: "@storybook/react-vite"`, `stories: ["../src/**/*.stories.tsx"]`, and `viteFinal` that removes plugins whose `name` starts with `tanstack-router` or `vite-plugin-checker`.
- [ ] **Step 3:** `preview.tsx` imports the same global CSS/font side-effect imports the app root uses (find them from `src/routes/__root.tsx` / `src/main.tsx`). Write `BrandMark.stories.tsx` with `Default` and a `Large` story using the component's own size API.
- [ ] **Step 4: Verify**

Run: `pnpm frontend build-storybook && git diff --exit-code apps/frontend/src/routeTree.gen.ts && pnpm frontend type-check && pnpm frontend lint:check`
Expected: build succeeds, no routeTree diff, no type or lint errors.

- [ ] **Step 5: Commit** `chore(frontend): add Storybook on the app's Vite config`

### Task 2: App-equivalent decorators (query, theme, router, viewports)

**Files:**

- Create: `apps/frontend/.storybook/decorators.tsx`
- Modify: `apps/frontend/.storybook/preview.tsx`
- Create: `apps/frontend/src/features/organizations/components/BackToEventsButton.stories.tsx`

**Interfaces:**

- Produces from `decorators.tsx`: `withQueryClient: Decorator` (new `QueryClient({ defaultOptions: { queries: { retry: false } } })` per story), `withTheme: Decorator` (reads `context.globals.theme: "light" | "dark"`, toggles `dark` on `document.documentElement`, wraps in `ThemeProvider` from `@/hooks/useTheme` and `TooltipProvider`), `withRouter: Decorator` (`createRootRoute({ component: () => <Story /> })`, `createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [context.parameters.route ?? "/"] }) })`, renders `<RouterProvider>`).
- Produces in `preview.tsx`: `globalTypes.theme` toolbar (light/dark, default light); viewports `mobile360` `{ width: "360px", height: "740px" }` and `desktop` `{ width: "1280px", height: "800px" }`; story parameter `route?: string`.

- [ ] **Step 1:** Write `BackToEventsButton.stories.tsx` with `Default`, `Mobile` (`globals: { viewport: { value: "mobile360" } }`) and `Dark` (`globals: { theme: "dark" }`); `Dark` has a `play` asserting `document.documentElement.classList.contains("dark")` and that a link is rendered (`canvas.getByRole("link")`).
- [ ] **Step 2:** Implement the three decorators and register them in `preview.tsx` in the order router (outermost) → query → theme.
- [ ] **Step 3: Verify** `pnpm frontend build-storybook && pnpm frontend type-check && pnpm frontend lint:check` all pass. (The `play` assertions first execute in Task 3, whose Step 3 must show them passing.)
- [ ] **Step 4: Commit** `chore(frontend): storybook decorators matching app providers`

### Task 3: Stories run as tests (Vitest browser + a11y) in check-all and CI

**Files:**

- Modify: `apps/frontend/vitest.config.ts` (two projects), `apps/frontend/package.json`, root `package.json` (`check-all`), `.github/workflows/ci.yml`
- Modify: `apps/frontend/.storybook/preview.tsx` (`parameters.a11y.test = "error"`)

**Interfaces:**

- Produces: Vitest projects `unit` (current jsdom config unchanged) and `storybook` (`storybookTest({ configDir: ".storybook" })`, browser `{ enabled: true, headless: true, provider: playwright(), instances: [{ browser: "chromium" }] }`). Scripts: `test:ci` = `vitest run --project unit`, `test:stories` = `vitest run --project storybook`. Root `check-all` runs `"frontend test:stories"` right after `"frontend test:ci"`.

- [ ] **Step 1:** Add `@storybook/addon-vitest@10.6.3 @storybook/addon-a11y@10.6.3 @vitest/browser-playwright playwright` (Vitest-4-compatible versions), register both addons in `main.ts`, configure the projects.
- [ ] **Step 2: Prove a failing story fails the run.** Temporarily add a `play` to `BackToEventsButton` `Default` asserting `getByRole("button", { name: "neexistuje" })`.
      Run: `pnpm frontend test:stories` → Expected: FAIL naming that story. Remove the assertion.
- [ ] **Step 3: Verify**
      Run: `pnpm frontend exec playwright install chromium && pnpm frontend test:stories && pnpm frontend test:ci`
      Expected: all story tests pass (a11y included), unit suite still 180+ passing.
- [ ] **Step 4:** CI: after "Test frontend" add `pnpm --filter frontend exec playwright install --with-deps chromium` and `pnpm frontend test:stories`. Request David's review for the `.github` change.
- [ ] **Step 5: Verify** `pnpm check-all` passes.
- [ ] **Step 6: Commit** `test(frontend): run stories as browser and a11y tests`

### Task 4: Pilot screen with fixtures + MSW (RegistrationsSection)

**Files:**

- Create: `apps/frontend/src/features/registrations/fixtures/registrations.ts`
- Test: `apps/frontend/src/features/registrations/fixtures/registrations.test.ts`
- Create: `apps/frontend/src/features/registrations/fixtures/handlers.ts`
- Create: `apps/frontend/src/features/registrations/components/RegistrationsSection.stories.tsx`, `RegistrationDetail.stories.tsx`
- Create: `apps/frontend/.storybook/public/mockServiceWorker.js` (via `pnpm dlx msw init .storybook/public`)
- Modify: `apps/frontend/.storybook/main.ts` (`staticDirs: ["./public"]`), `preview.tsx` (`initialize()`, `loaders: [mswLoader]`), `package.json` (`msw`, `msw-storybook-addon@3.0.3`)

**Interfaces:**

- Consumes: `registrationSummarySchema`, `registrationListSchema`, `registrationDetailSchema`, `RegistrationSummary`, `RegistrationList`, `RegistrationDetail` from `@/features/registrations/api/eventRegistrationSchemas`; `env.VITE_API_URL` from `@/config/env`.
- Produces: `makeRegistrationSummary(overrides?: Partial<RegistrationSummary>): RegistrationSummary`, `makeRegistrationList(items?: RegistrationSummary[]): RegistrationList`, `makeRegistrationDetail(overrides?: Partial<RegistrationDetail>): RegistrationDetail` — each returns `schema.parse(...)` of defaults merged with overrides. `registrationHandlers: { list(data: RegistrationList), empty(), error(status: number), loading() }` returning MSW `HttpHandler[]` for `${env.VITE_API_URL}/organizations/:organizationId/events/:eventId/registrations` (and `/:registrationId` for detail).

- [ ] **Step 1: Write the failing test** `registrations.test.ts`: `makeRegistrationList()` passes `registrationListSchema.parse`; `makeRegistrationSummary({ paymentState: "overpaid" }).paymentState === "overpaid"`; each `paymentStateSchema.options` value yields a valid summary.
- [ ] **Step 2:** `pnpm frontend test:ci -- registrations.test` → FAIL (module missing).
- [ ] **Step 3:** Implement factories with Czech names, CZK amounts and fixed ISO dates (no `Date.now()`, so stories are deterministic). Implement handlers.
- [ ] **Step 4:** `pnpm frontend test:ci -- registrations.test` → PASS.
- [ ] **Step 5:** Stories for `RegistrationsSection`: `Filled`, `Empty`, `Loading` (`delay("infinite")`), `Error` (500), `AllPaymentStates`, `Mobile`, `Dark`; each sets `parameters.msw.handlers`. `play` assertions: Filled shows a row per fixture item; Empty shows the `Empty` component's heading; Error shows an `Alert`. `RegistrationDetail`: `Paid`, `Partial`, `Waitlisted`.
- [ ] **Step 6: Verify** `pnpm frontend test:stories && pnpm frontend build && test ! -e apps/frontend/build/mockServiceWorker.js && pnpm check-all` all pass.
- [ ] **Step 7: Commit** `feat(frontend): registrations previews from schema fixtures`

### Task 5: Make it the default workflow for agents

**Files:**

- Modify: `.mcp.json` (add `"storybook": { "type": "http", "url": "http://localhost:6006/mcp" }`), `apps/frontend/.storybook/main.ts` (register `@storybook/addon-mcp@10.6.3`)
- Modify: `DESIGN.md` ("Sources" table: previews row; "Components → Adding or composing": step "add stories for every state"), `AGENTS.md` UI rules
- Modify: `.claude/settings.local.json` is per-user; document `enabledMcpjsonServers` addition instead of editing it

**Interfaces:**

- Produces the rule text for `AGENTS.md`: "New or changed UI starts as `<Component>.stories.tsx` with fixtures for loading, empty, error, filled, `mobile360` and dark, before any API wiring. Components that fetch get data through MSW handlers in `features/<f>/fixtures/handlers.ts`. `pnpm frontend test:stories` is the evidence; do not open the browser to check."

- [ ] **Step 1:** Register the MCP addon; start Storybook (`pnpm frontend storybook`, port 6006 is not an app port) and confirm `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:6006/mcp` returns a non-404 status. Stop it.
- [ ] **Step 2:** Update `.mcp.json`, `DESIGN.md`, `AGENTS.md` with the text above. Keep `/design-system` (DESIGN.md links it); migrating it into Storybook is a later, separate change.
- [ ] **Step 3: Verify** `pnpm check-all` passes.
- [ ] **Step 4: Commit** `docs: preview-first UI workflow and Storybook MCP`

## Deferred (separate plans)

- Pixel snapshots (`expect.element(...).toMatchScreenshot()` in Vitest browser mode): needs Linux-only baselines generated in CI to avoid macOS/Linux font diffs.
- Publishing `storybook-static` per PR for PM review (CI artifact or Coolify static site).
- `eslint-plugin-storybook` (lint config change; ask first).
- Splitting fetching sections into container + view so most stories need no MSW.
