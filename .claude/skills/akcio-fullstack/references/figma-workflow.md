# From Figma wireframe to code

## The connection

- Figma MCP server: `https://mcp.figma.com/mcp`, registered for the whole team in the repo's `.mcp.json`. Each developer approves it once in Claude Code and authenticates once with OAuth (`/mcp`, select `figma`, Authenticate). Tools appear as `mcp__figma__*`. Do not also install the Figma plugin (`figma@claude-plugins-official`): it bundles the same MCP server, so you would get it twice, and the server already serves Figma's skills through `get_figma_skill`.
- Wireframes: file **Wireframy**, file key `IxX3hZQjTZcGF381RD7h0w`, `https://www.figma.com/design/IxX3hZQjTZcGF381RD7h0w/Wireframy`. It has one page ("Page 1"). Frame node IDs are in `figma-map.md`.
- Design kit attached to that file: the library **shadcn ui kit community edition** (components named `<Component> - Nova`, variables named `shadcn colors/general/*`). Its colours and fonts are **outdated**. The canonical library is **Design system** (file key `hsSa2s0GRl0UgsT645F2ir`, frame `6002:3` "Design system preview"); its values are already in `global.css` and `DESIGN.md`. Take layout from Wireframy, visual values from `DESIGN.md`.
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

Every Figma kit component (`<Name> - Nova`) has a same-named shadcn component in `src/components/ui/` (Table Header/Cell -> `table`, Select & Combobox -> `select`, or `popover` + `command` when searchable, Radio -> `radio-group`, Tab (segmented) -> `tabs`, Sidebar Group Label -> `sidebar`, Označení stavu -> `badge` with a status variant). The list of what is in the kit and how to add more is in `DESIGN.md` ("Components"); `/design-system` in the dev app shows them all.

Components with Czech names in the Wireframy file ("Informační karta", "Údaj jednotky", "Hlavní cesta", "Výběr", "Vstupní údaj", "Souhrn vybraného pobytu", ...) are not kit components. They are layout compositions drawn for the wireframes. Build them as feature components out of the kit primitives.

## Token map (Figma variable -> repo token)

Wireframy uses the old kit's variables (`shadcn colors/general/*`, neutral greys, Geist); the repo uses the Design system values. Map by name, not by value: `general/<x>` -> `<x>` token (`bg-<x>`, `text-<x>`), `focus/ring` -> `ring`, `status/success` -> `success`, etc. The full token table, status meanings and contrast rules are in `DESIGN.md`. Never copy hex values from the reference code. Spacing: Figma `3xs/2xs/xs/sm/md` = 2/4/8/12/16 px, the same as the Tailwind scale (`0.5`, `1`, `2`, `3`, `4`).

## Where the wireframes are behind the decisions

Wireframes are layout references. When a wireframe and the sprint README or story disagree, the README and story win; report the difference.

- Brand text reads "Kemp.io" in places. The brand is **akc.io**.
- The adult application form in the wireframe has one "Jméno a příjmení" field and "Registrace zájmu je nezávazná ... nic neplatíte". S2-07 requires separate first name, last name, e-mail, phone and term selection with prices, and S2-08/09 produce a saved application with payment instructions.
- The child + legal guardian frames are out of sprint scope (adults only).
- "Rozdělení do pokojů" shows assigning people to rooms. Assigning a person to a room is out of Sprint 2; S2-05 uses the frame only for the room and bed registry.
- Wireframe controls on mobile are 48 px tall; the repo's `Input` is 36 px and `Button` default/lg are 36/40 px. This is an open question in `DESIGN.md`. Do not patch heights screen by screen.
- UX will deliver final copy and updated wireframes later (sprint README, "Zbývající příprava týmu"). Build structure now, keep copy easy to change.

## Keeping Figma and code in sync

1. `.mcp.json` stays committed; do not replace it with a personal config.
2. When a frame is added, renamed or replaced, update `figma-map.md` (node IDs are stable unless a frame is deleted and recreated).
3. When UX changes variables in the Design system library, re-read them with `get_variable_defs` on its nodes `6015:442` (Light panel) and `6015:540` (Dark panel) in file `hsSa2s0GRl0UgsT645F2ir`, and update `apps/frontend/src/styles/global.css` and the token table in `DESIGN.md` together.
4. If agents need the designs without Figma access (for example in unattended or cloud runs where OAuth is not possible), export the key frames as PNG into `docs/design/` and reference them from the stories. This is optional and not set up yet.
