# DESIGN.md - akc.io design requirements

> **Status: DRAFT, not approved by UX.** Extracted on 14 Oct 2026 from the Figma file _Wireframy_ (`IxX3hZQjTZcGF381RD7h0w`) and from `apps/frontend/src/styles/global.css`. The formal design-system task is [#79](https://github.com/applifting-vsecourse/team-4/issues/79) (`docs/sprints/sprint-2/delivery.md`, T6): UX approves the visual values, QA verifies states and accessibility. Until then, build with the values below and do not change tokens on your own. Everything under "Proposed" is **not applied**.

Read this before writing or changing any UI. How to turn a wireframe into code: `.claude/skills/akcio-fullstack/references/figma-workflow.md`.

## Principles

- **Kit only.** Every control comes from `apps/frontend/src/components/ui/` (shadcn, style `new-york`, neutral base, Lucide icons). A missing control is added with `pnpm dlx shadcn@latest add <name> --cwd apps/frontend`; it is not hand-rolled.
- **Semantic tokens only.** Use `bg-background`, `text-muted-foreground`, `border-border`, `ring-ring`, ... No hex values, no Figma variable names in code.
- **Mobile first.** The participant flow works at 360 px without horizontal scrolling and can be completed with prepared data in under two minutes (S2-07). The organizer screens are table-heavy and desktop-first but must not break at narrow widths.
- **Keyboard and accessibility.** All interactive elements are reachable and operable with the keyboard, have visible focus, and have accessible names. Form errors appear at the field and keep the other values (S2-07). `eslint-plugin-jsx-a11y` is on. QA checks states and accessibility (T4, T6).
- **States are part of the design.** Every data view has loading (`Skeleton`), empty, error (`Alert`) and, for controls, disabled and invalid states.
- **Czech copy, brand akc.io.** UI text is Czech. The brand name is "akc.io"; the wireframes still say "Kemp.io" in places. Times always name the time zone Europe/Prague; amounts are in CZK.
- **Light and dark.** `global.css` defines both (`.dark` class via `next-themes`); tokens make both work. The wireframes were not checked for dark mode.

## Foundations

### Colour (current repo values, `global.css`)

| Token                                     | Light                    | Dark                       |
| ----------------------------------------- | ------------------------ | -------------------------- |
| `background` / `foreground`               | #ffffff / #0a0a0a        | #0a0a0a / #fafafa          |
| `card` / `card-foreground`                | #ffffff / #0a0a0a        | #171717 / #fafafa          |
| `primary` / `primary-foreground`          | #171717 / #fafafa        | #e5e5e5 / #171717          |
| `secondary`, `muted`, `accent` (surfaces) | #f5f5f5                  | #262626                    |
| `muted-foreground`                        | #555555                  | #a1a1a1                    |
| `border`, `input`                         | #e5e5e5                  | #2e2e2e                    |
| `ring`                                    | #737373                  | #a1a1a1                    |
| `destructive`                             | oklch(0.55 0.2058 29.08) | oklch(0.6257 0.2058 29.08) |

Hex values are converted from the oklch values in `global.css`; `global.css` is the source.

### Radius

`--radius: 0.5rem` gives `rounded-lg` 8 px, `rounded-md` 6 px, `rounded-sm` 4 px.

### Typography

Font: **Geist** (`font-sans`, variable) and Geist Mono (`font-mono`), both already installed.

Type scale in the wireframes (Figma variables; tracking in px):

| Style           | Size / line height | Weight                              | Tracking |
| --------------- | ------------------ | ----------------------------------- | -------- |
| Heading 1       | 40 / 40            | Medium                              | -1.5     |
| Heading 2       | 26 / 26            | Medium                              | -1       |
| Heading 3       | 22 / 26.4          | Medium                              | -0.5     |
| Heading 4       | 18 / 21.6          | Medium                              | 0        |
| Paragraph small | 14 / 20            | Regular (Medium, Semibold variants) | 0        |

The repo has no type tokens yet (open for #79). Until they exist, use the closest Tailwind size utility, or the exact arbitrary value from this table where the design depends on it, and mention it in the report.

### Spacing

Figma `3xs`, `2xs`, `xs`, `sm`, `md` are 2, 4, 8, 12, 16 px, identical to the Tailwind scale (`0.5`, `1`, `2`, `3`, `4`). Use the Tailwind scale.

## Components

In the repo: alert, avatar, button, card, dialog, dropdown-menu, form, input, label, separator, skeleton, sonner, textarea.

Used by the wireframes and **not yet in the repo**: table, badge, checkbox, radio-group, switch, select (plus command and popover for searchable lists), tabs, sidebar, progress, breadcrumb, empty. The full mapping from Figma kit names is in `figma-workflow.md`. Add them before parallel UI work starts.

Control heights today: `Input` 36 px, `Button` default 36 px, `lg` 40 px. The mobile wireframe draws inputs and the primary button at **48 px**. Decision needed (see below) before building the participant flow.

## Proposed changes (need UX approval, not applied)

1. **Radius.** Figma uses `radius-lg` 10 px and `radius-md` 8 px. Setting `--radius: 0.625rem` in `global.css` yields 10 / 8 / 6 px and matches the kit and the wireframes. Affects every component.
2. **Mobile control height.** Add a shared 48 px size variant to `Input` and `Button` (or confirm 40 px) instead of per-screen overrides.
3. **Type tokens.** Define the five styles above as tokens.

## Where Figma should _not_ win

- `muted-foreground`: Figma #737373 has contrast 4.74:1 on white but **4.35:1 on the `muted` background (#f5f5f5), below WCAG AA 4.5:1** for normal text. The repo's #555555 gives 7.46:1 and 6.84:1. Keep the repo value.
- `ring`: Figma #d4d4d4 has 1.48:1 against white, below the 3:1 needed for a focus indicator. The repo's #737373 gives 4.74:1. Keep the repo value.
- `foreground`: Figma pure black vs repo #0a0a0a is not a meaningful difference; keep the repo value.

## Open questions for UX (#79)

- Which Figma library is canonical: _shadcn ui kit community edition_ (attached to Wireframy) or the account library _Design system_ (same Nova components, newer)?
- Are the radius and 48 px mobile control height deliberate?
- Which of the two frames named "Akce a turnusy" (`88:2093`, `88:2100`) is current?
- Final Czech copy, the e-mail layouts (S2-15) and the magic-link request screen (S2-13) are not drawn yet.
