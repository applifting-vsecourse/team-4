# From Figma wireframe to code

## The connection

- Figma MCP server: `https://mcp.figma.com/mcp`, registered for the whole team in the repo's `.mcp.json`. Each developer approves it once in Claude Code and authenticates once with OAuth (`/mcp`, select `figma`, Authenticate). Tools appear as `mcp__figma__*`. Do not also install the Figma plugin (`figma@claude-plugins-official`): it bundles the same MCP server, so you would get it twice, and the server already serves Figma's skills through `get_figma_skill`.
- Wireframes: file **Wireframy**, file key `IxX3hZQjTZcGF381RD7h0w`, `https://www.figma.com/design/IxX3hZQjTZcGF381RD7h0w/Wireframy`. It has one page ("Page 1"). Frame node IDs are in `figma-map.md`.
- Design kit attached to that file: the library **shadcn ui kit community edition** (components named `<Component> - Nova`, variables named `shadcn colors/general/*`). A second library named **Design system** with the same Nova components (updated 11 Oct 2026) exists in the account but is not attached to Wireframy; ask which one is canonical before relying on it.
- Access is limited to what the signed-in person may open. Limits: Education/Professional Full or Dev seat 200 calls per day and 10 per minute; View/Collab seats 20 calls per month. If a call fails on permissions, run `whoami` and check the seat on the plan that owns the file.

**Code Connect is not available** on these plans (it needs a Dev or Full seat on an Organization or Enterprise plan; `get_code_connect_map` returns that error). Do not call `get_code_connect_*`, `add_code_connect_map` or `send_code_connect_mappings`, and do not write `.figma.ts` files. The mapping tables below take its place and are maintained by hand.

## Procedure for one screen

1. Take the node ID from the story or `figma-map.md`. URLs use `node-id=38-22064`; the tools take `38:22064`.
2. Load Figma's own guidance first. The server serves it itself: call its `get_figma_skill` tool (or read the MCP resource) with `skill://figma/figma-design-to-code/SKILL.md`. It is mandatory before `get_design_context`.
3. Call `get_design_context` with `fileKey` `IxX3hZQjTZcGF381RD7h0w`, the node ID, `clientFrameworks` `react`, `clientLanguages` `typescript`, `skillNames` `resource:figma-design-to-code`. It returns reference code and a screenshot. The screenshot is the visual target.
4. Large frames (landing desktop is 1440 x 3135 px, landing mobile 360 x 5144 px): do not request the whole frame. Call `get_metadata` on that one frame ID, pick the section node IDs, and request them one by one. Never call `get_metadata` on the page `0:1`; it returns about 400 KB.
5. Translate the reference code, do not paste it. See "What the reference code contains" below.
6. Reuse before building: check `apps/frontend/src/components/ui/` and `features/` first. If the screen needs a control that is not in `ui/`, add it with the shadcn CLI before writing the screen (see the component table).
7. Verify: types, lint and tests (`SKILL.md`, Checks). Compare against the screenshot in the design context. Do not open the running app in a browser unless asked.

## What the reference code contains and how to translate it

| In the reference code                                                         | Replace with                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Absolute px sizes, `w-[320px]`, `h-[48px]`, fixed widths                      | Responsive Tailwind layout (flex, grid, `w-full`, `max-w-*`). Keep exact px only where the design is deliberately fixed.                                                                                                                                                              |
| `bg-[var(--shadcn-colors\/general\/border,#e5e5e5)]` and similar              | Semantic tokens: `border-border`, `bg-card`, ... (token table below). Never hex.                                                                                                                                                                                                      |
| Local re-implementations (`InputNova`, `Separator`, buttons built from `div`) | The kit: `Input`, `Separator`, `Button` from `@/components/ui`.                                                                                                                                                                                                                       |
| `const imgX = "https://www.figma.com/api/mcp/asset/..."`                      | Never ship these URLs (they expire after 7 days). Lucide icons: `lucide-react` by the same name (`Lucide / calendar-cog` -> `CalendarCog`). Other SVG or raster assets (logo, illustrations): download once into `apps/frontend/src/assets/` (create it, none exists yet) and import. |
| Text in `<p>` styled as heading                                               | Real semantic elements (`h1`..`h3`, `label`, `button`, `nav`), and the shadcn `FormLabel` for field labels.                                                                                                                                                                           |
| Czech sample content ("Lesní dobrodružství 2027")                             | Real data from the API. Sample text is not content.                                                                                                                                                                                                                                   |

Treat the code as a non-interactive prototype. Identify what is interactive (selection of terms, filters, form submit, tabs) and implement the behaviour from the story.

## Component map (Figma kit name -> repo)

`ui/` currently contains: alert, avatar, button, card, dialog, dropdown-menu, form, input, label, separator, skeleton, sonner, textarea.

| Figma component                                                       | Repo component                                                                                                | Status      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------- |
| Button - Nova, Icon Button - Nova                                     | `button` (`size="icon"`, `icon-sm`, ...)                                                                      | have        |
| Input - Nova                                                          | `input`                                                                                                       | have        |
| Textarea - Nova                                                       | `textarea`                                                                                                    | have        |
| Card - Nova                                                           | `card`                                                                                                        | have        |
| Alert - Nova                                                          | `alert`                                                                                                       | have        |
| Avatar With Image                                                     | `avatar`                                                                                                      | have        |
| Separator (Oddělovač)                                                 | `separator`                                                                                                   | have        |
| Popisek pole (field label)                                            | `FormLabel` in `form`                                                                                         | have        |
| Badge, Označení stavu (status label)                                  | `badge`                                                                                                       | **missing** |
| Checkbox - Nova                                                       | `checkbox`                                                                                                    | **missing** |
| Radio - Nova                                                          | `radio-group`                                                                                                 | **missing** |
| Switch - Nova                                                         | `switch`                                                                                                      | **missing** |
| Select & Combobox - Nova                                              | `select` (add `command` + `popover` only when the design shows searchable options)                            | **missing** |
| Tab (segmented) - Nova, Tabs (segmented) - Nova                       | `tabs`                                                                                                        | **missing** |
| Table Header, Table Cell (the most used components in the wireframes) | `table`                                                                                                       | **missing** |
| Sidebar Group Label - Nova                                            | `sidebar`                                                                                                     | **missing** |
| Progress - Nova                                                       | `progress`                                                                                                    | **missing** |
| Empty - Nova                                                          | `empty` if the registry offers it (check with `pnpm dlx shadcn@latest search`), otherwise compose from `card` | **missing** |
| Breadcrumb (Drobečková navigace)                                      | `breadcrumb`                                                                                                  | **missing** |

Add several at once, from the repo root:
`pnpm dlx shadcn@latest add badge checkbox radio-group switch select tabs table sidebar progress breadcrumb --cwd apps/frontend`
(this repo's `components.json` is style `new-york`, `src/styles/global.css`, aliases `@/components`, `@/lib/utils`). Check the diff afterwards; the `sidebar` component may add CSS variables to `global.css` that need a decision from UX.

Components with Czech names in the Wireframy file ("Informační karta", "Údaj jednotky", "Hlavní cesta", "Výběr", "Vstupní údaj", "Souhrn vybraného pobytu", ...) are not kit components. They are layout compositions drawn for the wireframes. Build them as feature components out of the kit primitives.

## Token map (Figma variable -> repo token)

Values read from the Figma file with `get_variable_defs`, repo values converted from `global.css` (oklch to sRGB).

| Figma variable             | Figma   | Repo token                   | Repo value | Match                                                                                   |
| -------------------------- | ------- | ---------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| general/background         | #ffffff | `background`                 | #ffffff    | yes                                                                                     |
| general/foreground         | #000000 | `foreground`                 | #0a0a0a    | near (pure black vs near black)                                                         |
| general/card               | #ffffff | `card`                       | #ffffff    | yes                                                                                     |
| general/card-foreground    | #0a0a0a | `card-foreground`            | #0a0a0a    | yes                                                                                     |
| general/primary            | #171717 | `primary`                    | #171717    | yes                                                                                     |
| general/primary foreground | #ffffff | `primary-foreground`         | #fafafa    | near                                                                                    |
| general/muted              | #f5f5f5 | `muted`                      | #f5f5f5    | yes                                                                                     |
| general/muted foreground   | #737373 | `muted-foreground`           | #555555    | **no: repo is darker, and better: Figma's is 4.35:1 on `muted`, below WCAG AA**         |
| general/border             | #e5e5e5 | `border`                     | #e5e5e5    | yes                                                                                     |
| general/input              | #e5e5e5 | `input`                      | #e5e5e5    | yes                                                                                     |
| focus/ring                 | #d4d4d4 | `ring`                       | #737373    | **no: Figma's is 1.48:1 on white, below the 3:1 non-text minimum; keep the repo value** |
| radius-lg                  | 10 px   | `rounded-lg` (`--radius`)    | 8 px       | **no**                                                                                  |
| radius-md                  | 8 px    | `rounded-md`                 | 6 px       | **no**                                                                                  |
| font                       | Geist   | `font-sans` (Geist Variable) | Geist      | yes                                                                                     |

The mismatches are analysed in `DESIGN.md` for the design-system task (#79): keep the repo's `muted-foreground` and `ring` (better contrast), and only the radius is a candidate change. Do not change `global.css` tokens on your own; use the repo token and note the visible difference in your report. Spacing: Figma `3xs/2xs/xs/sm/md` = 2/4/8/12/16 px, the same as the Tailwind scale (`0.5`, `1`, `2`, `3`, `4`).

## Where the wireframes are behind the decisions

Wireframes are layout references. When a wireframe and the sprint README or story disagree, the README and story win; report the difference.

- Brand text reads "Kemp.io" in places. The brand is **akc.io**.
- The adult application form in the wireframe has one "Jméno a příjmení" field and "Registrace zájmu je nezávazná ... nic neplatíte". S2-07 requires separate first name, last name, e-mail, phone and term selection with prices, and S2-08/09 produce a saved application with payment instructions.
- The child + legal guardian frames are out of sprint scope (adults only).
- "Rozdělení do pokojů" shows assigning people to rooms. Assigning a person to a room is out of Sprint 2; S2-05 uses the frame only for the room and bed registry.
- Wireframe controls on mobile are 48 px tall; the repo's `Input` is 36 px and `Button` default/lg are 36/40 px. Do not patch heights screen by screen. Raise it; if told to proceed, add one shared size variant in `components/ui/input.tsx` and `button.tsx`.
- UX will deliver final copy and updated wireframes later (sprint README, "Zbývající příprava týmu"). Build structure now, keep copy easy to change.

## Keeping Figma and code in sync

1. `.mcp.json` stays committed; do not replace it with a personal config.
2. When a frame is added, renamed or replaced, update `figma-map.md` (node IDs are stable unless a frame is deleted and recreated).
3. When UX changes variables in the kit, re-read them with `get_variable_defs` on a node, update `apps/frontend/src/styles/global.css` and the token table in `DESIGN.md` together.
4. If agents need the designs without Figma access (for example in unattended or cloud runs where OAuth is not possible), export the key frames as PNG into `docs/design/` and reference them from the stories. This is optional and not set up yet.
