# shadcn Agent Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make agents in this repo reliably use the existing shadcn/ui components and Tailwind theme tokens, enforced by `@shadcn/lint` errors on new code.

**Architecture:** Install the shadcn skill and MCP server for discovery; add `@shadcn/lint` to the existing frontend ESLint flat config (the only lint config that sees `.tsx`); expose one root `pnpm check`; document the rules in `AGENTS.md` (imported by `CLAUDE.md`); add a PostToolUse hook that lints edited `.tsx` files.

**Tech Stack:** pnpm 10.15 monorepo, Node 24.21, Vite + React 19, Tailwind v4.3, shadcn/ui (new-york, radix base), ESLint 10.8 flat config, TypeScript.

**Spec:** the user's request in this session (Steps 0–7 + final report). No separate spec file.

## Step 0 findings (done, read-only)

- `apps/frontend/components.json`: new-york, radix base, Tailwind v4, CSS `src/styles/global.css`, alias `@/components/ui`. `shadcn info -c apps/frontend`: framework Vite, TS, 29 installed components (alert … tooltip).
- Tailwind **v4.3.3**; package manager **pnpm 10.15.0**; Node **v24.21.0**.
- Lint: **ESLint 10.8.1** flat config at `apps/frontend/eslint.config.js`; lint deps come from the `lint` catalog in `pnpm-workspace.yaml`. Gate passes (v4 + ESLint).
- Catch: `src/components/ui/**` is in the **global** `ignores`, so today ESLint never sees it. Token rules there need that ignore moved off the global level (Task 3).
- `AGENTS.md` exists (points to `CLAUDE.md`); no `.mcp.json`, no `.claude/settings.json`, no project `.claude/skills/`. Frontend `test:ci` takes ~6.4 s, `type-check` ~3.3 s, so tests go into `check`.

## Global Constraints

- No commits. Leave everything in the working tree on branch `chore/shadcn-agent-guardrails`.
- No refactors, no major upgrades. Only new dependency: `@shadcn/lint` (plus whatever `npx skills` / `shadcn mcp` need to run via `npx`, nothing in `package.json`).
- Use pnpm everywhere (`pnpm dlx`, `pnpm frontend …`). Do not run `pnpm dev`. Do not open the browser.
- If a step fails, stop and report why. Do not improvise around it.
- Do not bulk-fix legacy violations.
- Exact `note`: `"See AGENTS.md, UI rules."`
- Rules at `error`: `shadcn/no-restyle` (`{ allow: ["layout"] }`), `shadcn/no-raw-colors`, `shadcn/no-arbitrary-values`, `shadcn/no-inline-styles`, `shadcn/no-unknown-classes`. `no-restyle` is `off` in `src/components/ui/**`; the other four stay on there.
- Final gate before handing back: `pnpm check-all` passes (CLAUDE.md rule).
- The upstream SETUP.md says "don't enable new rules or add overrides". The user explicitly asked for these rules, so the user's request wins. Mention this in the report.

## Review Focus

1. Un-ignoring `src/components/ui/**` must not apply the project's TS/import/react rules to vendored primitives. Only `shadcn/*` rules may report there (Task 3, Step 6).
2. Files listed in the legacy baseline get **warnings**. Any file not on the list, including a new file inside a legacy directory, gets **errors** (Task 3, Step 8 probe).
3. The hook must exit 0 silently for non-`.tsx` files, backend files and files with only warnings. It blocks (exit 2) only on errors (Task 6, Step 3).
4. New `.json`/`.md`/`.js`/`.sh` files must pass root `format:check` (Task 7, Step 5 via `check-all`).
5. Throwaway probe files are fully removed, and `git status` shows only the intended files (Task 7, Step 4).

---

### Task 1: shadcn skill

**Files:**

- Create: `.claude/skills/shadcn/**` (written by the CLI)

- [ ] **Step 1:** Run `npx skills add --help` and pick the flags that select Claude Code as the agent and a project (non-global) install, non-interactively.
- [ ] **Step 2:** Run `npx skills add shadcn/ui` with those flags from the repo root.
- [ ] **Step 3: Verify:** `ls .claude/skills` lists a shadcn skill dir containing `SKILL.md`. If it landed elsewhere (e.g. `~/.claude/skills`, `.agents/skills`) or touched `package.json`/the lockfile, stop and report.

### Task 2: shadcn MCP server

**Files:**

- Create: `.mcp.json`

- [ ] **Step 1:** Write `.mcp.json` exactly as in https://ui.shadcn.com/docs/mcp:
      `{"mcpServers":{"shadcn":{"command":"npx","args":["shadcn@latest","mcp"]}}}` (Prettier-formatted). Use the manual file rather than `pnpm dlx shadcn@latest mcp init --client claude`, because it can't touch other files.
- [ ] **Step 2: Verify connect:** `claude mcp list` shows `shadcn … ✓ Connected`. Note: `.claude/settings.local.json` has `enabledMcpjsonServers: ["figma","idea"]`, so the session may not load `shadcn` until the user approves it. Do not edit that local file. Tell the user to run `/mcp` and approve it.
- [ ] **Step 3: Prove it lists components:** if the `mcp__shadcn__*` tools are loaded in this session, call the list/search-registry tool for `@shadcn`. Otherwise, run a scratchpad Node script that spawns `npx shadcn@latest mcp` with `cwd: apps/frontend` over stdio and sends `initialize`, then `tools/list`, then `tools/call` on the registry-listing tool. Expected: a JSON list that includes `button`, `card`. Report the tool names and the component count.

### Task 3: @shadcn/lint

**Files:**

- Modify: `pnpm-workspace.yaml` (catalog `lint`: add `'@shadcn/lint': ^<latest>`)
- Modify: `apps/frontend/package.json` (devDependency `"@shadcn/lint": "catalog:lint"`)
- Modify: `apps/frontend/eslint.config.js`

**Interfaces:**

- Produces: `pnpm frontend lint:check` reports `shadcn/*` rules; `SHADCN_LEGACY_FILES: string[]` constant in `eslint.config.js`.

- [ ] **Step 1:** Look up the latest version (`pnpm view @shadcn/lint version`), add it to the `lint` catalog, reference it from frontend devDependencies, then run `pnpm install`. Confirm its peer range accepts ESLint 10. If it doesn't, stop.
- [ ] **Step 2: Baseline before changes:** run `pnpm frontend exec eslint './src/**/*.{ts,tsx,js,cjs,mjs}' -f json -o <scratchpad>/before.json` and record the error/warning counts per ruleId.
- [ ] **Step 3: Move the ui ignore off the global level.** Remove `"src/components/ui/**"` from the global `ignores` block (keep the comment, now explaining the scoping). Wrap the existing project config entries (everything after the global ignores block) with `.map((c) => ({ ...c, ignores: [...(c.ignores ?? []), "src/components/ui/**"] }))` so the project rules still skip ui. Every mapped entry has keys besides `ignores`, so none becomes a global ignore.
- [ ] **Step 4: Append the shadcn blocks** after the project entries:
  - Block A, `files: ["src/**/*.tsx"]`: `languageOptions.parser: tseslint.parser` with `ecmaFeatures.jsx: true` (no type info needed for ui), `plugins: { shadcn }` (import `shadcn` as the plugin default export from `@shadcn/lint`, matching its README), `settings: { shadcn: { note: "See AGENTS.md, UI rules." } }`, and the five rules at `error` with `no-restyle` options `{ allow: ["layout"] }`. Leave out `ui`/`themeImports`, because `components.json` discovery already covers them. Check with Step 5.
  - Block B, `files: ["src/components/ui/**"]`: `"shadcn/no-restyle": "off"`.
- [ ] **Step 5: Run and count:** run lint to JSON again and count per `shadcn/*` rule, split into ui vs. non-ui. If the run reports a config/discovery error (e.g. theme not found), stop and report. That is not a lint finding.
- [ ] **Step 6: Verify Review Focus 1:** non-`shadcn/*` counts equal the Step 2 baseline, and no non-shadcn rule reports any file under `src/components/ui/`.
- [ ] **Step 7: Scope legacy (only if total shadcn violations > 50):** add `const SHADCN_LEGACY_FILES = [...]`, a sorted list of every file path (relative to `apps/frontend`) with a shadcn violation in Step 5. Add Block C after Block B: `files: SHADCN_LEGACY_FILES`, the same five rules at `warn` (keep `no-restyle` off for ui paths in the list by ordering C before B, or by splitting C into ui/non-ui). Add a one-line comment: legacy baseline, warnings only, delete entries as files get fixed. File-level, not directory-level, so new files anywhere get errors. If ≤ 50, skip this step, and lint:check now fails. Stop and ask the user, because fixing is out of scope.
- [ ] **Step 8: Verify Review Focus 2:** `pnpm frontend lint:check` exits 0 (warnings only). Then create `src/features/<a dir that's in the legacy list>/__probe.tsx` with `<div className="bg-red-500" />`, lint it, and expect an `error` from `shadcn/no-raw-colors`. Delete the probe.

### Task 4: `lint` and `check` commands

**Files:**

- Modify: `package.json` (root scripts)

- [ ] **Step 1:** Add root scripts next to `check-all`:
  - `"lint": "pnpm frontend lint:check"`
  - `"check": "run-s \"frontend type-check\" \"frontend lint:check\" \"frontend test:ci\""` (tests included, ~6 s)
- [ ] **Step 2: Verify:** `pnpm check` exits 0 and takes under ~30 s wall clock.

### Task 5: AGENTS.md "UI rules"

**Files:**

- Modify: `AGENTS.md` (append `## UI rules` section)
- Modify: `CLAUDE.md` (add one line `@AGENTS.md` near the top, so Claude Code loads it. AGENTS.md keeps its plain link to CLAUDE.md, which is not an import, so there is no cycle)

- [ ] **Step 1:** Append `## UI rules`, ≤ 25 lines total for the section, covering exactly the user's six bullets:
      stack line (Vite + React 19, Tailwind v4, shadcn/ui, TypeScript, in `apps/frontend`); look up components via shadcn MCP or `pnpm dlx shadcn@latest docs <component>`, add missing with `pnpm dlx shadcn@latest add <name>` (run in `apps/frontend`), never hand-roll a primitive shadcn provides; semantic tokens only (`bg-background`, `text-muted-foreground`, …), no raw palette colors / arbitrary values / inline styles; pages control layout only, appearance from variants and sizes; don't, without asking: add theme tokens, add lint-disable comments, edit the lint config (incl. `SHADCN_LEGACY_FILES`), or edit `components/ui` to silence a violation; after any UI change run `pnpm check` and fix every error (`pnpm check-all` still gates handoff).
- [ ] **Step 2: Verify:** `wc -l` on the section ≤ 25. Grep that the heading text is exactly `UI rules` (the lint `note` points to it).

### Task 6: Claude Code hook (optional, skip if unclear)

**Files:**

- Create: `.claude/hooks/lint-tsx.sh` (executable)
- Create: `.claude/settings.json`

- [ ] **Step 1:** Check the current hooks docs (https://code.claude.com/docs/en/hooks). Confirm three things: PostToolUse stdin JSON carries `tool_input.file_path`; exit code 2 feeds stderr back to Claude; `$CLAUDE_PROJECT_DIR` is set. If any of these differs, skip the task and report.
- [ ] **Step 2:** `.claude/settings.json`: `hooks.PostToolUse` with matcher `"Edit|Write|MultiEdit"` → `{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-tsx.sh" }`. The script parses stdin with `node -e` (no jq dependency). If the path is not `*.tsx` under `apps/frontend/src/`, it exits 0. Otherwise it runs `pnpm --filter frontend exec eslint <path relative to apps/frontend>`. On non-zero exit it prints the output to stderr and exits 2.
- [ ] **Step 3: Verify Review Focus 3:** pipe fake payloads into the script: a backend `.ts` file → exit 0; a legacy `.tsx` with warnings only → exit 0; a probe `.tsx` with `bg-red-500` → exit 2 with the rule name on stderr. Delete the probe.

### Task 7: Prove it works and close out

**Files:**

- Create then delete: `apps/frontend/src/components/LintProbe.tsx`, `apps/frontend/src/components/LintProbeCard.tsx`

- [ ] **Step 1:** Create `LintProbe.tsx` that exports a component rendering `<Button className="bg-red-500 p-4">Test</Button>` (import from `@/components/ui/button`). Run `pnpm check`. Expected: it fails with `shadcn/no-restyle` (and `shadcn/no-raw-colors`). The messages name a Button variant/size or a token, and they end with "See AGENTS.md, UI rules." Quote the messages in the report, then delete the file.
- [ ] **Step 2:** Through the shadcn MCP (or the Task 2 stdio fallback), fetch the `card` and `button` usage. Create `LintProbeCard.tsx` using `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` and `Button variant="outline" size="sm"`, with layout-only classNames (e.g. `flex justify-end`). `pnpm check` exits 0.
- [ ] **Step 3:** Delete `LintProbeCard.tsx`.
- [ ] **Step 4: Verify Review Focus 5:** `git status --porcelain` lists only: `.claude/skills/…`, `.claude/settings.json`, `.claude/hooks/lint-tsx.sh`, `.mcp.json`, `AGENTS.md`, `CLAUDE.md`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `apps/frontend/package.json`, `apps/frontend/eslint.config.js`, this plan file.
- [ ] **Step 5:** Run `pnpm check-all`. Exit 0. If `format:check` fails on new files, run `pnpm format` and re-run.
- [ ] **Step 6:** Final report, ≤ 15 lines: files changed, commands added, shadcn violation counts per rule (ui vs. non-ui), how legacy was scoped, skipped items and why (incl. the `/mcp` approval the user must do and the SETUP.md "no new rules" deviation).
