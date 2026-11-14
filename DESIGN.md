# DESIGN.md - akc.io design system

> **Status:** living document, iterated over time ([#79](https://github.com/applifting-vsecourse/team-4/issues/79)). Tokens live in `global.css` and are documented here; anything listed under "Open questions" is not decided yet.

Read this before writing or changing any UI. Everything here applies to `apps/frontend`.

You are extending an existing product, not designing a new one. Most UI rework so far came from screens built in isolation: their own width, button placement, wording and explanations. The rules below exist so new UI fits the app on the first try. Each rule states its reason; when a case is not covered, follow the reason and copy the nearest existing screen.

## Before you build

1. **Find the place.** Look up the area in the table below and the existing page the story belongs to. Extend that page; add a route only when the story names a new destination.
2. **Copy the neighbours.** Read two or three screens of the same area and match their shell, header, section style, action placement and states.
3. **Reuse before writing.** Search the feature folder for the domain word (status, amount, term, back link) and use the existing component or helper.
4. **Build only the acceptance criteria.** No extra explanations, settings, statistics or decorations; propose them to the PM instead.

| Area             | Routes                                                                                     | Shell                                                             | Audience and viewport                                |
| ---------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------- |
| Public           | `/`, `/for-*`, `/events`, `/e/$publicId`, `/e/$publicId/registration`, `/login`, `/signup` | `PublicShell`; landing pages own layout; `AuthLayout` for sign-in | Anyone; **mobile first**                             |
| Participant      | `/my-registrations/*`, `/platba/$token`                                                    | `ParticipantLayout`                                               | Event attendee, usually on a phone; **mobile first** |
| Organization     | `/organizations`, `/organizations/$organizationId`                                         | sidebar + `WorkspacePage` + `PageHeader`                          | Organizer at a desktop                               |
| Event management | `/organizations/$organizationId/events/$eventId/*`                                         | sidebar + `WorkspacePage` + `PageHeader` with `EventBreadcrumb`   | Organizer at a desktop                               |

**Viewport.** Public and participant screens are designed at 360 px first and must work there without horizontal page scrolling. Organizer screens are desktop screens: they must work from 1024 px up with nothing overlapping, clipped or pushed out of reach (row actions stay visible), but a phone is not a target. Dense organizer views such as Přihlášky are not meant to fit a phone; let their table scroll in its container and do not build mobile card layouts or hide columns unless the story asks.

## Layout and navigation

- **One container per area.** Render pages inside the area's shell and do not add your own `mx-auto max-w-*` page wrapper. A narrow form sits inside the page, left-aligned with the header. _Why: breadcrumbs and titles must not jump when moving between sibling routes._
- **Fixed page anatomy.** `PageHeader`: breadcrumb, title with status badge, actions on the right. At most one primary (lime) button per view. Actions of a card or row sit at its trailing end; Cancel (`outline`) comes before the confirming button.
- **A way back from every page.** Event management uses the breadcrumb. Public and participant sub-pages (detail, form, payment) start with a back link above the title: `Button variant="ghost" size="sm"` with `ArrowLeft`, label "Zpět na …" naming the target.
- **Show the result of an action.** After creating or changing something, land where the result is visible (a term added from Přehled → the term list) and confirm with a toast.
- **State that should survive refresh or Back/Forward lives in the URL**: tab, view, filters, selected term or queue, sort. Validate it in the route's `validateSearch` (zod, `.catch(undefined)`). Keep only transient UI (open dialog, hover) in component state.
- **In-page changes keep the scroll position.** Updating search params for a tab, filter or selection navigates with `resetScroll: false` and adds a history entry, so Back returns to the previous selection. Use `replace: true` only for values that change on every keystroke, such as a search box. Moving to another route keeps the router default (top of the page; restored on Back). A link to a section uses the router's `hash` and the target element's `id`, so it lands on that content.
- **Loading never shrinks the page.** Keep tabs and selectors rendered while their content loads. When a parameter changes, show the previous data until the new data arrives (`placeholderData: keepPreviousData`); while it belongs to the previous selection, make it `inert` with `aria-busy` when acting on it would target the wrong item. A first load uses a `Skeleton` about the height of the content it replaces. _Why: a shrinking page jumps the user away from where they were working._
- **Tab rows and switchers stay on one line.** Wrap them in `HorizontalOverflowViewport`, which scrolls sideways and shows an edge cue. Do not wrap them onto two lines or truncate labels.
- **Buttons are as wide as their content.** Use full width only on purpose, for a single primary action in a narrow column, and cap it: `w-full max-w-sm`. Do not give buttons fixed widths to line them up.

## Content

- **Write only what the user needs to decide or act.** Headings, labels and the controls explain the UI; do not add a muted paragraph that restates them. Business rules belong in the issue, not on the screen.
- **One state, one message, with the next step.** Do not stack badges, alerts and paragraphs that describe the same state.
  - Don't: „Bez návrhu“ + „Termín zatím nebyl vyhodnocen“ + „Bez platného návrhu“ on one screen.
  - Do: „Termín zatím nebyl vyhodnocen. Návrh vznikne automaticky, nebo ho spusťte tlačítkem Přepočítat.“
- **A disabled control says why**, in visible text next to it. If an action is never available in the current state, hide it instead of linking to a dead-end page.
- **Information is text, not a control.** Notices use `Alert` or plain text with an icon, shown in full and wrapped onto more lines when needed; never a disabled button or a badge carrying a sentence.
- **No implementation details in user copy**: no "simulace", IDs, enum values, error codes or time-zone identifiers ("Europe/Prague"). Times are shown in Prague local time without a zone label.
- **One word, one meaning.** Before naming something, search the existing labels for the same concept and reuse them. Examples: „Přihláška obdržena“ (date) vs „Zaplaceno“ (money); „Zrušit účast“ (registration) vs „Odhlásit se“ (session).
- **Buttons name the outcome**: „Vyplnit přihlášku“, not „Přihlásit se“, when the click opens a form.
- **Make the deciding figure stand out.** When a view shows several numbers, the one the user acts on (remaining balance, free beds) is the most prominent and coloured by state, as in `BalanceAmount`.

## Data display

- **Tables align by column.** Header and cells share alignment. Amounts and counts are right-aligned in `font-mono tabular-nums`; text, statuses and badges are left-aligned. Do not right-align a column without numbers.
- **A row that opens a detail is one link across the whole row** (hover spans every column, one keyboard stop named by the row's main text). Reuse the row-link pattern of `RegistrationsSection` and `EventsTable`; it works in Safari.
- **The same value looks the same everywhere.** Amounts use `formatCzk` and mono digits in organizer and participant views alike; dates use the helpers in `src/lib/date.ts`.
- **Statuses reuse the feature's badge** (`ParticipationBadge`, `PaymentStateBadge`, `EventStatusBadge`, …). The same state has the same label and variant for organizers and participants.
- **Things on one line align.** Icon and text: `items-center`, icon `shrink-0`. A status badge sits on the line of the title it describes; buttons for that item go below it, aligned to the row end.

## Forms

- **Guide input instead of only rejecting it.** Disable impossible choices (dates that overlap a stored term or end before the start) and reveal a follow-up field as soon as its option is picked (e.g. „Jiná odpověď“ → text input).
- **Required fields are marked**, and an invalid submit moves focus to the first invalid field without clearing the other values.

## Checklist before handoff

- [ ] The page lives in its area's shell and matches its neighbours' structure.
- [ ] Public/participant: works at 360 px. Organizer: nothing clipped or overlapping at 1024 px.
- [ ] Light and dark themes.
- [ ] Loading, empty, error and disabled states, each with one message and a next step.
- [ ] No text that repeats the UI or reveals implementation.
- [ ] Switching tabs, filters or selections keeps the scroll position; refresh and Back restore them.
- [ ] Columns, numbers, badges and buttons are aligned; each page has a way back; each action shows its result.

## Sources

| What                                      | Where                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Tokens, colours, type (canonical)         | `apps/frontend/src/styles/global.css`                                                                        |
| Components in code                        | `apps/frontend/src/components/ui/`                                                                           |
| Live preview of all tokens and components | `/design-system` in the running dev app (`src/routes/design-system.tsx`, dev only, 404 in production builds) |
| Screen stories                            | Storybook: `pnpm storybook` → <http://localhost:6006>, one light desktop story per screen with fixture data  |

## Principles

- **shadcn/ui is the design system.** Every control is a shadcn component from `src/components/ui/`. Nothing is hand-rolled, not even where a native element would do.
- **Semantic tokens only.** Use classes like `bg-background`, `text-muted-foreground`, `border-border`, `bg-success-subtle`. No hex values, no arbitrary colours (`bg-[#...]`).
- **Accessible by default.** Keyboard reachable, visible focus, accessible names, errors shown at the field without losing the other values. `eslint-plugin-jsx-a11y` is on.
- **States are part of the design.** Data views have loading (`LoadingBlock` with `Skeleton`), empty (`Empty`) and error (`LoadError`) states; controls have disabled and invalid states.
- **Czech UI copy, brand "akc.io".** Amounts in CZK; times in Prague local time.
- **Light and dark.** Both themes are defined in `global.css` (`.dark` class via `next-themes`). Using tokens makes both work; check new UI in both with the theme switcher.

## Components

### Using them

Import from `@/components/ui/<name>` and use the component meant for the job (`Button` for buttons, `Select` for selects, `Table` for tables, ...). The `/design-system` page shows what exists and how each looks in every state; its source in `src/features/design-system/components/` is a working usage example for each one, including a validated form (`react-hook-form` + `zod` + `Form`).

Currently in the kit: alert, aspect-ratio, avatar, badge, breadcrumb, button, card, checkbox, command, dialog, dropdown-menu, empty, form, input, label, popover, progress, radio-group, select, separator, sheet, sidebar, skeleton, sonner (toasts), switch, table, tabs, textarea, tooltip.

Patterns built from them:

- **Searchable select (combobox):** `Popover` + `Command`, see `EventCombobox` in the preview.
- **Collapsible section:** `CollapsibleSection` from `src/components/ui/collapsible-section.tsx` for consistent full-row triggers and animated content height.
- **Status labels:** `Badge` with a status variant (table below).
- **Table labels:** Place a badge that leads a left-aligned cell directly inside `TableCell`. Its text aligns with the column header and the fill extends into the gutter.
- **Confirmation of destructive actions:** `ConfirmDeleteDialog` (below).
- **Feedback after an action:** `toast` from `sonner` (the `Toaster` is mounted in `__root.tsx`).

### Shared app components

Recurring states and page actions have one component each in `src/components/`. Use them instead of composing `Alert`, `Empty` or `Skeleton` in a feature; `Alert` is imported only by `Notice` and `FormError`.

| Need                                      | Component                                                          | Rule                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| In-page message                           | `Notice tone="info" \| "success" \| "warning" \| "error"`          | The tone picks the icon and colour; `title` is always set (a one-sentence notice is a title only); details and actions go in children; `icon` only for an extra meaning (`Lock`).      |
| Failed save or action of a form or dialog | `FormError message title? action?`                                 | At the form, above its buttons. `action` only for a way on that differs from submitting again (a retry that checks a lost response). Success is a `toast`, never a dialog or a notice. |
| Failed load or refresh                    | `LoadError title? description? shownFrom? onRetry action? variant` | `inline` in a section, `page` instead of the whole content. With old data still shown, pass `shownFrom`. Never shown as an empty state.                                                |
| Loading placeholder                       | `LoadingBlock label` around `Skeleton`s                            | Always a named `role="status"`; never an `aria-label` without a role, never the empty state while loading.                                                                             |
| Missing or foreign record                 | `RecordUnavailable title? icon? action?`                           | Same look for a missing and a foreign record.                                                                                                                                          |
| Confirming a deletion                     | `ConfirmDeleteDialog title consequence errorMessage? onConfirm`    | One verb: „Odstranit“. Its failure stays in the dialog.                                                                                                                                |
| Reloading a list or detail                | `RefreshButton`                                                    | „Aktualizovat“ / „Aktualizuji…“.                                                                                                                                                       |
| Way back to the parent page               | `BackLink to params`                                               | Ghost button with `ArrowLeft` above the page heading.                                                                                                                                  |
| Titled part of a page                     | `PageSection title description? actions? isBusy? headingId?`       | A region named by its `h2`; actions on the right of the heading. `headingId` only when a link points at the section. Subsections with an `h3` stay hand-written.                       |

### Adding or composing

1. **A shadcn component that is not in the kit yet:** from the repo root run
   `pnpm dlx shadcn@latest add <name> --cwd apps/frontend`
   - Answer **No** to every "overwrite?" prompt; existing files may be customised.
   - Check the diff afterwards. The CLI has resolved `@/lib/utils` to an npm package named `cn` (`import { cn } from "cn"`) and added `cn` to `package.json`; fix the import to `@/lib/utils` and remove the dependency.
   - The CLI may append CSS variables to `global.css`; replace their values with the tokens documented here.
   - Run `pnpm prettier --write` on the new files; `src/components/ui/` is excluded from ESLint (vendored code) but not from Prettier.
2. **A reusable variant or generic composition** of kit primitives: put it in `src/components/ui/` too, built only from kit primitives and tokens. Example: the `success`, `warning` and `destructive-subtle` variants added to `badge.tsx`, and the `success` and `warning` variants of `alert.tsx` (icon in the status colour). An app component with akc.io copy or behaviour that several features share goes to `src/components/` (see Shared app components).
3. **Something used by one feature only:** a feature component in `src/features/<feature>/components/`, built from the kit.
4. Show any new component or variant on the `/design-system` page.

Hooks used by shadcn components live in `src/hooks/` with the repo's naming (`useIsMobile.ts`, not shadcn's `use-mobile.ts`), because that folder is linted.

## Foundations

### Colour tokens

Light and dark values are defined in `global.css`. Utility class = `bg-`/`text-`/`border-` + token name.

The visual direction is **"Ticket stub"** (S3-T2): warm paper surfaces, dark warm ink for text and outlines, lime for action. Dark mode is **"Night ticket"**, a palette of its own rather than an inversion: cool, barely tinted slate surfaces (hue 262) so lime stays the only loud colour; elevation by lighter surfaces (sidebar < background < card < popover, hover and selection lighter still); off-white text instead of pure white; slightly desaturated accents and status colours in OKLCH. In dark mode cards are outlined in `border` and stand out by their surface; form controls and buttons keep the `input` outline. No large light areas in dark mode: tooltips use the `popover` surface there, paper-coloured illustrations are dimmed, and inverted panels become dark cards (see Shape).

| Token                                       | Light                                                     | Dark                                                               | Use for                                                           |
| ------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `background` / `foreground`                 | `oklch(0.955 0.035 95)` paper / `oklch(0.17 0.03 60)` ink | `oklch(0.175 0.012 262)` slate / `oklch(0.93 0.006 262)` off-white | Page                                                              |
| `card` / `card-foreground`                  | `oklch(0.99 0.018 95)` / ink                              | `oklch(0.212 0.014 262)` / off-white                               | Cards, tables, panels                                             |
| `popover` / `popover-foreground`            | same as `card`                                            | `oklch(0.25 0.015 262)` / off-white                                | Menus, popovers, select lists                                     |
| `primary` / `primary-foreground`            | `oklch(0.87 0.21 125)` lime / ink                         | `oklch(0.88 0.19 128)` / `oklch(0.21 0.035 135)`                   | Main action, active state (lime with ink text)                    |
| `secondary`, `muted`, `accent`              | `oklch(0.91 0.04 95)`                                     | `oklch(0.262 0.014 262)`; `accent` `oklch(0.3 0.016 262)`          | Secondary buttons, subdued surfaces, light form field fill, hover |
| `muted-foreground`                          | `oklch(0.42 0.04 60)`                                     | `oklch(0.74 0.015 262)`                                            | Secondary text, descriptions                                      |
| `border`                                    | `oklch(0.78 0.04 85)`                                     | `oklch(0.33 0.014 262)`; also the card outline                     | Dividers, table rules                                             |
| `input`                                     | ink                                                       | `oklch(0.54 0.016 262)`                                            | Form control outlines                                             |
| `ring`                                      | `oklch(0.55 0.2 30)` brick                                | `oklch(0.72 0.13 250)` blue                                        | Focus ring                                                        |
| `destructive`                               | `#b91c1c`                                                 | `oklch(0.69 0.19 23)`                                              | Destructive actions, form errors                                  |
| `destructive-subtle` / `-subtle-foreground` | `#fef2f2` / `#b91c1c`                                     | `oklch(0.285 0.07 23)` / `oklch(0.81 0.11 23)`                     | Failed, error status                                              |
| `success` / `success-subtle`                | `#166534` / `#f0fdf4`                                     | `oklch(0.8 0.15 152)` / `oklch(0.28 0.055 155)`                    | Confirmed, paid                                                   |
| `warning` / `warning-subtle`                | `#c2410c` / `#fff7ed`                                     | `oklch(0.82 0.14 72)` amber / `oklch(0.3 0.06 65)`                 | Waitlisted (náhradník), partially paid                            |
| `sidebar*`                                  | page surface and text; warm active item                   | `oklch(0.155 0.011 262)`, below the page; active item on `accent`  | Organizer navigation                                              |
| `chart-1` … `chart-5`                       | blue, lime, green, orange, gray                           | same                                                               | Charts only                                                       |
| `overlay`                                   | black at 50 % opacity                                     | black at 65 % opacity                                              | Scrim behind dialogs and sheets                                   |

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

- `Card`, filled and outline `Button`s, `Input`, `Textarea` and `Select` triggers have a 1.5 px `foreground` outline (focus and invalid states keep their own colour). Badges keep their 1 px border. A button keeps the shape as a trigger too (`DialogTrigger asChild` and the like): the rules match its variant and size, not its `data-slot`.
- In light mode form fields (`Input`, `Textarea`, `Select` triggers, radios and unchecked checkboxes) take the `muted` surface, so they remain distinct from both the paper page and card panels. Dark mode keeps its lighter control fill.
- Cards and those buttons cast a small hard shadow (`2px 2px 0` in `foreground`); a pressed button shifts by 1 px. The `shadow-*` tokens are hard offset shadows in `foreground`, too. In dark mode there are no shadows: the `shadow-*` tokens are empty and depth comes from lighter surfaces and outlines. Ghost and link buttons have neither outline nor shadow.
- A panel inverted with `bg-foreground`/`text-background` in light mode adds `dark:bg-card dark:text-card-foreground dark:border-border`, so it stays a dark card in dark mode instead of turning into a light block.
- `h1`–`h3` and card titles are weight 800 with -0.03 em tracking.

### Contrast rules (checked against WCAG 2.2 AA)

- **Never use `primary` (lime) as text, icon or border colour on light surfaces**; it nearly disappears on paper. Lime is a fill with `primary-foreground` on it (13.5:1). For links use `text-foreground underline`.
- `foreground` on `background` is 16.9:1, on `card` 18.7:1. Active tabs use a `foreground` underline in light mode and a `primary` underline in dark mode.
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
