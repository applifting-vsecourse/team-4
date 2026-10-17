# DESIGN.md - akc.io design system

> **Status:** living document, iterated over time ([#79](https://github.com/applifting-vsecourse/team-4/issues/79)). Tokens are synced from the Figma library **Design system**; anything listed under "Open questions" is not decided yet.

Read this before writing or changing any UI. Everything here applies to `apps/frontend`.

## Sources

| What                                      | Where                                                                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens, colours, type (canonical)         | Figma library **Design system**: <https://www.figma.com/design/hsSa2s0GRl0UgsT645F2ir/Design-system>, frame `6002:3` "Design system preview" |
| Screen layouts                            | Figma file **Wireframy**: <https://www.figma.com/design/IxX3hZQjTZcGF381RD7h0w/Wireframy> (layout only, see below)                           |
| Tokens in code                            | `apps/frontend/src/styles/global.css`                                                                                                        |
| Components in code                        | `apps/frontend/src/components/ui/`                                                                                                           |
| Live preview of all tokens and components | `/design-system` in the running dev app (`src/routes/design-system.tsx`, dev only, 404 in production builds)                                 |

Wireframy is attached to the older _shadcn ui kit community edition_ library, so its colours and fonts are out of date. Take **layout and structure** from Wireframy and **all visual values** from Design system and this file. Where two Wireframy frames share a name, the one with actual UI is current (for "Akce a turnusy" that is `88:2100`; `88:2093` is a text mapping to docs).

## Principles

- **Web app, mobile browser first.** akc.io is a responsive web app, not a native app. Every screen must work in a phone browser at 360 px wide without horizontal page scrolling. Wide content (tables) scrolls inside its own container. Organizer screens may be desktop-oriented but must not break on a phone.
- **shadcn/ui is the design system.** Every control is a shadcn component from `src/components/ui/`. Nothing is hand-rolled, not even where a native element would do.
- **Semantic tokens only.** Use classes like `bg-background`, `text-muted-foreground`, `border-border`, `bg-success-subtle`. No hex values, no arbitrary colours (`bg-[#...]`), no Figma variable names in components.
- **Accessible by default.** Keyboard reachable, visible focus, accessible names, errors shown at the field without losing the other values. `eslint-plugin-jsx-a11y` is on.
- **States are part of the design.** Data views have loading (`Skeleton`), empty (`Empty`) and error (`Alert`) states; controls have disabled and invalid states.
- **Czech UI copy, brand "akc.io".** Amounts in CZK, times always state Europe/Prague.
- **Light and dark.** Both themes are defined in `global.css` (`.dark` class via `next-themes`). Using tokens makes both work; check new UI in both with the theme switcher.

## Components

### Using them

Import from `@/components/ui/<name>` and use the component meant for the job (`Button` for buttons, `Select` for selects, `Table` for tables, ...). The `/design-system` page shows what exists and how each looks in every state; its source in `src/features/design-system/components/` is a working usage example for each one, including a validated form (`react-hook-form` + `zod` + `Form`).

Currently in the kit: alert, avatar, badge, breadcrumb, button, card, checkbox, command, dialog, dropdown-menu, empty, form, input, label, popover, progress, radio-group, select, separator, sheet, sidebar, skeleton, sonner (toasts), switch, table, tabs, textarea, tooltip.

Patterns built from them:

- **Searchable select (combobox):** `Popover` + `Command`, see `EventCombobox` in the preview.
- **Status labels:** `Badge` with a status variant (table below).
- **Confirmation of destructive actions:** `Dialog` with a `destructive` button.
- **Feedback after an action:** `toast` from `sonner` (the `Toaster` is mounted in `__root.tsx`).

### Adding or composing

1. **A shadcn component that is not in the kit yet:** from the repo root run
   `pnpm dlx shadcn@latest add <name> --cwd apps/frontend`
   - Answer **No** to every "overwrite?" prompt; existing files may be customised.
   - Check the diff afterwards. The CLI has resolved `@/lib/utils` to an npm package named `cn` (`import { cn } from "cn"`) and added `cn` to `package.json`; fix the import to `@/lib/utils` and remove the dependency.
   - The CLI may append CSS variables to `global.css`; replace their values with the Design system ones.
   - Run `pnpm prettier --write` on the new files; `src/components/ui/` is excluded from ESLint (vendored code) but not from Prettier.
2. **A reusable composition** (a new variant, or a component made of several kit primitives used across features): put it in `src/components/ui/` too, built only from kit primitives and tokens. Example: the `success`, `warning` and `destructive-subtle` variants added to `badge.tsx`.
3. **Something used by one feature only:** a feature component in `src/features/<feature>/components/`, built from the kit.
4. Show any new component or variant on the `/design-system` page.

Hooks used by shadcn components live in `src/hooks/` with the repo's naming (`useIsMobile.ts`, not shadcn's `use-mobile.ts`), because that folder is linted.

## Foundations

### Colour tokens

Values come from the Figma library Design system (modes Light and Dark). Utility class = `bg-`/`text-`/`border-` + token name.

| Token                                       | Light                                                 | Dark                  | Use for                                         |
| ------------------------------------------- | ----------------------------------------------------- | --------------------- | ----------------------------------------------- |
| `background` / `foreground`                 | `#f9fafb` / `#111827`                                 | `#030712` / `#f9fafb` | Page                                            |
| `card` / `card-foreground`                  | `#ffffff` / `#111827`                                 | `#111827` / `#f9fafb` | Cards, tables, panels                           |
| `popover` / `popover-foreground`            | `#ffffff` / `#111827`                                 | `#1f2937` / `#f9fafb` | Menus, popovers, select lists                   |
| `primary` / `primary-foreground`            | `#bef264` / `#111827`                                 | same                  | Main action, active state (lime with dark text) |
| `secondary`, `muted`, `accent`              | `#f3f4f6`                                             | `#1f2937`             | Secondary buttons, subdued surfaces, hover      |
| `muted-foreground`                          | `#6b7280`                                             | `#9ca3af`             | Secondary text, descriptions                    |
| `border` / `input`                          | `#e5e7eb`                                             | `#1f2937` / `#374151` | Borders, input outlines                         |
| `ring`                                      | `#2563eb`                                             | `#60a5fa`             | Focus ring                                      |
| `destructive`                               | `#dc2626`                                             | `#ef4444`             | Destructive actions, form errors                |
| `destructive-subtle` / `-subtle-foreground` | `#fef2f2` / `#b91c1c`                                 | `#450a0a` / `#f87171` | Overdue, failed, error status                   |
| `success` / `success-subtle`                | `#15803d` / `#f0fdf4`                                 | `#4ade80` / `#052e16` | Confirmed, paid                                 |
| `warning` / `warning-subtle`                | `#c2410c` / `#fff7ed`                                 | `#fb923c` / `#431407` | Waitlisted (náhradník), partially paid          |
| `sidebar*`                                  | dark navy surface with lime active item in both modes |                       | Organizer navigation                            |
| `chart-1` … `chart-5`                       | blue, lime, green, orange, gray                       | same                  | Charts only                                     |
| `overlay`                                   | black at 50 % opacity                                 | same                  | Scrim behind dialogs and sheets                 |

Status meaning, used consistently across the app:

| Domain state                            | Badge variant            |
| --------------------------------------- | ------------------------ |
| Confirmed term, paid in full            | `success`                |
| Waitlisted (náhradník), partial payment | `warning`                |
| Overdue payment, failed, error          | `destructive-subtle`     |
| Neutral / informational                 | `secondary` or `outline` |

Values not given by the Figma library and filled in by convention: `popover-foreground`, `accent-foreground`, `destructive-foreground`, `sidebar-foreground`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`, `overlay`.

### Contrast rules (checked against WCAG 2.2 AA)

- **Never use `primary` (lime) as text, icon or border colour on light surfaces**; it has 1.3:1 against white. Lime is a fill with `primary-foreground` on it (13.6:1). For links use `text-foreground underline`.
- `muted-foreground` passes on `background` (4.6:1) and `card` (4.8:1) but **not on `muted`** (4.4:1). Don't put secondary text on `bg-muted` in light mode.
- `input` border against white is 1.2:1 (shadcn default style). Inputs remain identifiable by their label and focus ring, but this is noted for UX.
- All status pairs (`success` on `success-subtle`, etc.), `ring` and dark-mode text pass AA.

### Typography

- **Space Grotesk** (`font-sans`, the default) for all text. Geist Mono (`font-mono`) for code, variable symbols and amounts in tables.
- Heading scale, as Tailwind utilities defined in `global.css`:

| Class     | Size / line height | Weight | Tracking |
| --------- | ------------------ | ------ | -------- |
| `text-h1` | 40 / 40 px         | 500    | -1.5 px  |
| `text-h2` | 26 / 26 px         | 500    | -1 px    |
| `text-h3` | 22 / 26.4 px       | 500    | -0.5 px  |
| `text-h4` | 18 / 21.6 px       | 500    | 0        |

Body text is `text-sm` (14 / 20 px) or `text-base`. Use real heading elements (`h1`-`h4`) with these classes.

### Radius

`--radius: 0.625rem` → `rounded-lg` 10 px, `rounded-md` 8 px, `rounded-sm` 6 px, `rounded-xl` 14 px.

### Spacing

Tailwind's default scale. Figma `3xs`/`2xs`/`xs`/`sm`/`md` = 2/4/8/12/16 px = Tailwind `0.5`/`1`/`2`/`3`/`4`.

## Open questions

- **Control height on mobile.** Wireframy draws mobile inputs and the primary button at 48 px; the kit uses 36 px (`Input`, `Button`) and 40 px (`Button size="lg"`). Undecided; don't override heights per screen. If needed, add one shared size variant to `button.tsx` and `input.tsx`.
- The Design system preview also shows **Inter**; it's unclear where (if anywhere) it should be used. Everything uses Space Grotesk for now.
- `muted-foreground` on `muted` and the `input` border contrast (see contrast rules).
