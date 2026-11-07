# DESIGN.md - akc.io design system

> **Status:** living document, iterated over time ([#79](https://github.com/applifting-vsecourse/team-4/issues/79)). Tokens live in `global.css` and are documented here; anything listed under "Open questions" is not decided yet.

Read this before writing or changing any UI. Everything here applies to `apps/frontend`.

## Sources

| What                                      | Where                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Tokens, colours, type (canonical)         | `apps/frontend/src/styles/global.css`                                                                                |
| Components in code                        | `apps/frontend/src/components/ui/`                                                                                   |
| Live preview of all tokens and components | `/design-system` in the running dev app (`src/routes/design-system.tsx`, dev only, 404 in production builds)         |
| Screen previews                           | Storybook: `pnpm frontend storybook` → <http://localhost:6006>, one light desktop story per screen with fixture data |

## Principles

- **Web app, mobile browser first.** akc.io is a responsive web app, not a native app. Every screen must work in a phone browser at 360 px wide without horizontal page scrolling. Wide content (tables) scrolls inside its own container. Organizer screens may be desktop-oriented but must not break on a phone.
- **shadcn/ui is the design system.** Every control is a shadcn component from `src/components/ui/`. Nothing is hand-rolled, not even where a native element would do.
- **Semantic tokens only.** Use classes like `bg-background`, `text-muted-foreground`, `border-border`, `bg-success-subtle`. No hex values, no arbitrary colours (`bg-[#...]`).
- **Accessible by default.** Keyboard reachable, visible focus, accessible names, errors shown at the field without losing the other values. `eslint-plugin-jsx-a11y` is on.
- **States are part of the design.** Data views have loading (`Skeleton`), empty (`Empty`) and error (`Alert`) states; controls have disabled and invalid states.
- **Czech UI copy, brand "akc.io".** Amounts in CZK, times always state Europe/Prague.
- **Light and dark.** Both themes are defined in `global.css` (`.dark` class via `next-themes`). Using tokens makes both work; check new UI in both with the theme switcher.

## Components

### Using them

Import from `@/components/ui/<name>` and use the component meant for the job (`Button` for buttons, `Select` for selects, `Table` for tables, ...). The `/design-system` page shows what exists and how each looks in every state; its source in `src/features/design-system/components/` is a working usage example for each one, including a validated form (`react-hook-form` + `zod` + `Form`).

Currently in the kit: alert, aspect-ratio, avatar, badge, breadcrumb, button, card, checkbox, command, dialog, dropdown-menu, empty, form, input, label, popover, progress, radio-group, select, separator, sheet, sidebar, skeleton, sonner (toasts), switch, table, tabs, textarea, tooltip.

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
   - The CLI may append CSS variables to `global.css`; replace their values with the tokens documented here.
   - Run `pnpm prettier --write` on the new files; `src/components/ui/` is excluded from ESLint (vendored code) but not from Prettier.
2. **A reusable composition** (a new variant, or a component made of several kit primitives used across features): put it in `src/components/ui/` too, built only from kit primitives and tokens. Example: the `success`, `warning` and `destructive-subtle` variants added to `badge.tsx`.
3. **Something used by one feature only:** a feature component in `src/features/<feature>/components/`, built from the kit.
4. Show any new component or variant on the `/design-system` page.

Hooks used by shadcn components live in `src/hooks/` with the repo's naming (`useIsMobile.ts`, not shadcn's `use-mobile.ts`), because that folder is linted.

## Foundations

### Colour tokens

Light and dark values are defined in `global.css`. Utility class = `bg-`/`text-`/`border-` + token name.

The visual direction is **"Ticket stub"** (S3-T2): warm paper surfaces, dark warm ink for text and outlines, lime for action. Dark mode is **"Night ticket"**, a palette of its own rather than an inversion: cool, barely tinted slate surfaces (hue 262) so lime stays the only loud colour; elevation by lighter surfaces (sidebar < background < card < popover, hover and selection lighter still); off-white text instead of pure white; slightly desaturated accents and status colours in OKLCH. In dark mode cards are outlined in `border` and stand out by their surface; form controls and buttons keep the `input` outline. No large light areas in dark mode: tooltips use the `popover` surface there, paper-coloured illustrations are dimmed, and panels never invert `bg-foreground` (see the dark panel rule under Shape).

| Token                                       | Light                                                     | Dark                                                                                      | Use for                                        |
| ------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `background` / `foreground`                 | `oklch(0.955 0.035 95)` paper / `oklch(0.17 0.03 60)` ink | `oklch(0.175 0.012 262)` slate / `oklch(0.93 0.006 262)` off-white                        | Page                                           |
| `card` / `card-foreground`                  | `oklch(0.99 0.018 95)` / ink                              | `oklch(0.212 0.014 262)` / off-white                                                      | Cards, tables, panels                          |
| `popover` / `popover-foreground`            | same as `card`                                            | `oklch(0.25 0.015 262)` / off-white                                                       | Menus, popovers, select lists                  |
| `primary` / `primary-foreground`            | `oklch(0.87 0.21 125)` lime / ink                         | `oklch(0.88 0.19 128)` / `oklch(0.21 0.035 135)`                                          | Main action, active state (lime with ink text) |
| `secondary`, `muted`, `accent`              | `oklch(0.91 0.04 95)`                                     | `oklch(0.262 0.014 262)`; `accent` `oklch(0.3 0.016 262)`                                 | Secondary buttons, subdued surfaces, hover     |
| `muted-foreground`                          | `oklch(0.42 0.04 60)`                                     | `oklch(0.74 0.015 262)`                                                                   | Secondary text, descriptions                   |
| `border`                                    | `oklch(0.78 0.04 85)`                                     | `oklch(0.33 0.014 262)`; also the card outline                                            | Dividers, table rules                          |
| `input`                                     | ink                                                       | `oklch(0.54 0.016 262)`                                                                   | Form control outlines                          |
| `ring`                                      | `oklch(0.55 0.2 30)` brick                                | `oklch(0.72 0.13 250)` blue                                                               | Focus ring                                     |
| `destructive`                               | `#b91c1c`                                                 | `oklch(0.69 0.19 23)`                                                                     | Destructive actions, form errors               |
| `destructive-subtle` / `-subtle-foreground` | `#fef2f2` / `#b91c1c`                                     | `oklch(0.285 0.07 23)` / `oklch(0.81 0.11 23)`                                            | Failed, error status                           |
| `success` / `success-subtle`                | `#166534` / `#f0fdf4`                                     | `oklch(0.8 0.15 152)` / `oklch(0.28 0.055 155)`                                           | Confirmed, paid                                |
| `warning` / `warning-subtle`                | `#c2410c` / `#fff7ed`                                     | `oklch(0.82 0.14 72)` amber / `oklch(0.3 0.06 65)`                                        | Waitlisted (náhradník), partially paid         |
| `sidebar*`                                  | page surface and text; warm active item                   | `oklch(0.155 0.011 262)`, below the page; lime-tinted active item `oklch(0.29 0.035 128)` | Organizer navigation                           |
| `chart-1` … `chart-5`                       | blue, lime, green, orange, gray                           | same                                                                                      | Charts only                                    |
| `overlay`                                   | black at 50 % opacity                                     | black at 65 % opacity                                                                     | Scrim behind dialogs and sheets                |

Status meaning, used consistently across the app:

| Domain state                            | Badge variant            |
| --------------------------------------- | ------------------------ |
| Confirmed term, paid in full            | `success`                |
| Waitlisted (náhradník), partial payment | `warning`                |
| Failed, error                           | `destructive-subtle`     |
| Neutral / informational                 | `secondary` or `outline` |

Filled in by shadcn convention: `popover-foreground`, `accent-foreground`, `destructive-foreground`, `sidebar-foreground`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`, `overlay`.

### Shape

The ticket-stub shape is part of the components, set once in `global.css`; pages don't recreate it:

- `Card`, filled and outline `Button`s, `Input`, `Textarea` and `Select` triggers have a 1.5 px `foreground` outline (focus and invalid states keep their own colour). Badges keep their 1 px border.
- Cards and those buttons cast a small hard shadow (`2px 2px 0` in `foreground`); a pressed button shifts by 1 px. The `shadow-*` tokens are hard offset shadows in `foreground`, too. In dark mode the tokens are near-black, and buttons cast their shadow in the `input` outline colour instead, so it stays visible on dark surfaces. Ghost and link buttons have neither outline nor shadow.
- A panel that should stay dark in both themes takes the `dark` class with `bg-card` and `border-border`, instead of inverting `bg-foreground`/`text-background`. A highlighted one (the landing organizer panel and closing call to action) takes `border-primary` and may label itself in `text-primary`; lime text is fine there because the panel is dark in both themes.
- `h1`–`h3` and card titles are weight 800 with -0.03 em tracking.

### Contrast rules (checked against WCAG 2.2 AA)

- **Never use `primary` (lime) as text, icon or border colour on light surfaces**; it nearly disappears on paper. Lime is a fill with `primary-foreground` on it (13.5:1). For links use `text-foreground underline`.
- `foreground` on `background` is 16.9:1, on `card` 18.7:1. The kit's 60 % `foreground` text (inactive tabs) is 4.6:1 on `muted`; the ink value is chosen for this, so don't lighten it.
- `muted-foreground` passes on `background` (7.5:1), `card` (8.3:1) and `muted` (6.6:1); in dark mode 8.2:1, 7.7:1 and 6.7:1.
- `destructive` text passes on `background` (5.7:1) and `card` (6.3:1); white on `destructive` is 6.5:1. In dark mode `destructive` on `card` is 5.8:1 and its text on the kit's 60 % destructive fill 6.0:1.
- Dark mode: `foreground` on `background` is 15.4:1 (off-white, not 21:1, to avoid halation), on `card` 14.4:1; `primary-foreground` on lime 12.8:1; `input` outlines are 3.2:1 or more on every surface; `ring` is 7.7:1 on `background`.
- `ring` is 4.7:1 on `background`; form controls are outlined in ink, so their outline is as strong as text.
- All status pairs (`success` on `success-subtle`, etc.) and dark-mode text pass AA.

### Typography

- **Bricolage Grotesque** (`font-sans`, the default) for all text. Geist Mono (`font-mono`) for code, variable symbols, amounts in tables and small uppercase labels.
- Heading scale, as Tailwind utilities defined in `global.css`:

| Class     | Size / line height | Weight | Tracking |
| --------- | ------------------ | ------ | -------- |
| `text-h1` | 40 / 40 px         | 500    | -1.5 px  |
| `text-h2` | 26 / 26 px         | 500    | -1 px    |
| `text-h3` | 22 / 26.4 px       | 500    | -0.5 px  |
| `text-h4` | 18 / 21.6 px       | 500    | 0        |

Body text is `text-sm` (14 / 20 px) or `text-base`. Use real heading elements (`h1`-`h4`) with these classes. On `h1`–`h3` the ticket-stub shape (see Shape) sets weight 800 and -0.03 em tracking over the scale above.

### Radius

`--radius: 0.5rem` → `rounded-lg` 8 px, `rounded-md` 6 px, `rounded-sm` 4 px, `rounded-xl` 12 px.

### Spacing

Tailwind's default scale.

## Open questions

- The screens other than the landing page use the new tokens and shape but have not been redesigned to the S3-T2 layouts yet.
