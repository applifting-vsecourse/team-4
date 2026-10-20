# Agent instructions

Read and follow [CLAUDE.md](CLAUDE.md) for repository instructions, including PM ownership of stories and delivery gates.

Before implementing a story, read [docs/sitemap.md](docs/sitemap.md), the matching GitHub issue and its sprint decisions. Use the sitemap for placement and access context; use the story for scope. The detailed workflow and conflict rules are in those documents.

## UI rules

Frontend stack (`apps/frontend`): Vite + React 19, Tailwind v4, shadcn/ui, TypeScript.

- Before building UI, look up existing components through the shadcn MCP or
  `pnpm dlx shadcn@latest docs <component>`. Add missing ones from
  `apps/frontend` with `pnpm dlx shadcn@latest add <name>`. Never hand-roll a
  primitive shadcn provides. In this monorepo, shadcn CLI commands run from the
  root need `-c apps/frontend`.
- A freshly added `src/components/ui` file can fail the token rules (upstream
  arbitrary values). Report those findings to the developer instead of editing
  the file or the lint config.
- Semantic tokens only (`bg-background`, `text-muted-foreground`,
  `bg-destructive`, …). No raw palette colors, arbitrary values (`p-[13px]`) or
  inline styles.
- Pages control layout only. Appearance comes from component variants and
  sizes; if none fits, ask instead of restyling with `className`.
- Do not, without asking the developer: add theme tokens, add lint-disable
  comments, edit the lint config (including `SHADCN_LEGACY_FILES`), or edit
  `src/components/ui` just to make a violation go away.
- After any UI change, run `pnpm check` and fix every error before finishing.
  `pnpm check-all` still gates handoff.
