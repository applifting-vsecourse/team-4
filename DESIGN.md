# Design contract

Read this before writing or changing any UI — human or agent.

These are rules, not suggestions. When a rule and a "nicer looking" idea disagree, the rule wins. Consistency across every screen beats a clever one.

`src/components/ui/**` is vendored shadcn — treat it as a third-party kit and restyle via tokens rather than rewriting it.

**Tokens live in `apps/frontend/src/styles/global.css`.** That file is the only source of truth for colour, radius and shadows. This file says how to _use_ them.

## Colour

- **Never hardcode a colour.** No `#hex`, no `bg-blue-500`, no `rgb()`. Use the semantic classes only: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-primary`, `bg-secondary`, `border-border`, `bg-destructive`.
- **`primary` is for actions, not decoration.** One primary button per view. Everything else is `outline`, `ghost` or a plain link.
- **`destructive` only for destructive actions and errors.** Never for emphasis.
- **`accent` is a hover/active surface, not a brand colour.** It tints menu items and ghost buttons on hover, so it must stay quiet. The brand colour is `primary`.
- Body text is `foreground`; supporting text is `muted-foreground`. There is no third level.

## Layout

- **Cards are for separable items in a list** — a quack, a search result, a product. They are not page sections and not layout tools.
- **Never nest a card inside a card.** If content needs grouping inside a card, use spacing and a hairline divider.
- **A page is not a card.** Page content sits on `background` in a centred column (`max-w-2xl` for reading, `max-w-4xl` for wide layouts), not inside a floating panel.
- **Every page keeps the app chrome.** The header is present on every route, including login and sign-up. Pages never render as standalone islands.
- Forbidden by default: the centred-hero-plus-three-feature-cards layout, carousels, and any section whose only purpose is to look full.

## Spacing

Use the scale only: `1, 2, 3, 4, 6, 8, 12, 16` (Tailwind units — 4px…64px). No arbitrary values like `p-[13px]`. Related things get `gap-2`/`gap-3`; separate blocks get `gap-6`/`gap-8`.

## Type

- One `h1` per page. Headings step down without skipping.
- Sizes come from the scale: `text-sm` supporting, `text-base` body, `text-lg`/`text-xl` subheads, `text-2xl`+ page titles. Headings get `tracking-tight`; body does not.
- Sentence case everywhere. No ALL CAPS except a single small label style (`text-xs uppercase tracking-widest`), used sparingly.

## Surfaces

- **Borders are hairlines**: `border border-border`. One border, not two adjacent ones.
- **Shadows are rare.** Only for things that genuinely float above the page — dropdowns, dialogs, toasts. Cards and inputs do not get shadows.
- Radius comes from the token (`rounded-lg`/`rounded-md`). Never mix radii in one component.

## Forms

- Every input has a visible `<label>`. Placeholders are examples, never labels.
- Validation runs client-side _and_ server-side. The client message appears under the field.
- The submit button shows a pending state and is disabled while submitting.
- Never disable a submit button just because the form is untouched — let the user try and show them what's wrong.

## Every list has three states

Loading, empty, and error — all three, always. An empty list renders an empty state with one sentence saying what would appear here, not a blank area. An error renders the message and a way to retry.

Data refreshes itself: refetch when the tab regains focus, and invalidate the query after a mutation. A manual "reload" button in normal UI means one of those is missing — retry belongs in the error state only.

## Accessibility (the floor, not the ceiling)

- Buttons are `<button>`, links are `<a>`/`<Link>`. Never a `div` with `onClick`.
- Every icon-only control has an `aria-label`.
- Focus rings are never removed. If you restyle focus, it must stay clearly visible.
- Text contrast at least 4.5:1 — the tokens are chosen to satisfy this; hardcoded colours are how you break it.

## When you are unsure

Prefer less: fewer borders, fewer boxes, fewer font sizes, more whitespace. If a screen feels plain, the fix is usually better spacing and clearer hierarchy, not another container.

## Extending this file

When a code review keeps repeating the same UI feedback, add it here as a rule. That is the point of the file: expectations live in the repo, not in someone's head.
