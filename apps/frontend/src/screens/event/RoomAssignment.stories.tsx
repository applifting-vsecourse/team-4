import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { apiUrl, failOn, neverAnswer } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta } from "@/screens/screenMeta"
import { openRowMenu, showsText } from "@/screens/steps"

import { placementHandlers, PLACEMENTS } from "@/features/accommodation/fixtures/placementHandlers"
import {
  NOT_SPLIT_STORE,
  TURNED_MIXED_STORE,
  UNAVAILABLE_ROOM_STORE,
  WITHOUT_PEOPLE_STORE,
  WITHOUT_PLACEMENTS_STORE,
  WITHOUT_ROOMS_STORE,
  WITHOUT_VALUE_STORE,
  type PlacementStore,
} from "@/features/accommodation/fixtures/placements"
import {
  PUBLICATION,
  publicationHandlers,
  PUBLISHED_AT,
  type PublicationStore,
} from "@/features/accommodation/fixtures/publication"
import { OPEN_EVENT } from "@/features/events/fixtures/events"

// Správa akce → Ubytování → Rozdělení do pokojů (F14-2): manual room
// placements of the selected term. MSW answers with the backend's rules
// (#337) and keeps every save in memory.

const meta = {
  title: "Screens/Event/Room Assignment",
  ...screenMeta,
  args: { url: eventUrl("/rooms?tab=split&view=assignment") },
  beforeEach: ({ msw, parameters }) => {
    msw.use(
      ...placementHandlers(parameters.placements as PlacementStore | undefined),
      ...publicationHandlers(parameters.publication as PublicationStore | undefined),
      ...organizerBackend(),
    )
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

type Canvas = StoryContext["canvas"]

/** The section, so room labels elsewhere on the page don't match. */
const section = async (canvas: Canvas) => {
  const heading = await canvas.findByRole(
    "heading",
    { name: "Uložené rozdělení" },
    { timeout: 5000 },
  )
  const element = heading.closest<HTMLElement>("section")
  if (!element) throw new Error("No section Uložené rozdělení")
  return within(element)
}

/** A room row, or the drop target for "Bez pokoje". */
const zone = async (canvas: Canvas, name: string | RegExp) => {
  const board = await section(canvas)
  const regionName =
    typeof name === "string" && !name.startsWith("Bez pokoje") ? `Pokoj ${name}` : name
  return board.findByRole("region", { name: regionName })
}

const zoneOf = async (canvas: Canvas, name: string | RegExp) => {
  const element = await zone(canvas, name)
  const region = within(element)
  const trigger = element.querySelector<HTMLButtonElement>('[data-slot="collapsible-trigger"]')
  if (trigger?.getAttribute("aria-expanded") === "false") await userEvent.click(trigger)
  return region
}

const revealPerson = async (canvas: Canvas, person: string) => {
  const board = await section(canvas)
  if (board.queryByText(person)?.checkVisibility()) return
  for (const roomName of ["Chatka 1", "Chatka 2", "Chatka 3", "Srub u lesa"]) {
    const element = await zone(canvas, roomName)
    const room = within(element)
    const trigger = element.querySelector<HTMLButtonElement>('[data-slot="collapsible-trigger"]')
    if (trigger?.getAttribute("aria-expanded") === "false") await userEvent.click(trigger)
    if (room.queryByText(person)?.checkVisibility()) return
  }
}

/** Drags the participant onto the room's card, as the browser does. */
const drag = async (canvas: Canvas, person: string, target: string | RegExp) => {
  await revealPerson(canvas, person)
  const item = (await (await section(canvas)).findByText(person)).closest("li")
  if (!item) throw new Error(`No item for ${person}`)
  const card = await zone(canvas, target)
  // One DataTransfer for the whole drag, as in a browser; Testing Library's
  // fireEvent would give each event a fresh, empty one.
  const dataTransfer = new DataTransfer()
  const fire = (target: Element, type: string) =>
    target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }))
  fire(item, "dragstart")
  fire(card, "dragover")
  fire(card, "drop")
  fire(item, "dragend")
}

/** Opens the participant's menu and picks the items in order (a submenu, then its item). */
const pick = async (canvas: Canvas, person: string, ...items: (string | RegExp)[]) => {
  await revealPerson(canvas, person)
  await openRowMenu(canvas, person)
  const body = within(document.body)
  for (const item of items) {
    await userEvent.click(await body.findByRole("menuitem", { name: item }))
  }
}

const openPersonMenu = async (canvas: Canvas, person: string) => {
  await revealPerson(canvas, person)
  return openRowMenu(canvas, person)
}

const findDialog = async (room: string) => {
  const dialog = await within(document.body).findByRole("dialog", {
    name: `Umístit do pokoje ${room}`,
  })
  await waitFor(() => expect(dialog).toBeVisible())
  return within(dialog)
}

/** Rooms with their occupancy and free places, the people without a room, a locked mixed room. */
export const Placements: Story = {
  globals: { viewport: { value: "organizer1024", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBe(1024)
    const board = await section(canvas)
    await expect(await board.findByText("Rozdělení podle pohlaví")).toBeVisible()
    const chatka1 = await zoneOf(canvas, "Chatka 1")
    await expect(await chatka1.findByText("4 / 4 + 1")).toBeVisible()
    await expect(chatka1.getByText(/volná místa 1/i)).toBeVisible()
    await expect((await zoneOf(canvas, "Chatka 3")).getByText("Volný")).toBeVisible()
    const srub = await zoneOf(canvas, "Srub u lesa")
    await expect(srub.getAllByLabelText("Zamčené umístění")).toHaveLength(2)
    // The partners' mixed room is a confirmed exception, not a new problem.
    await expect(srub.getByText("Smíšený, výjimka")).toBeVisible()
    await expect(chatka1.queryByText(/^Smíšený/)).not.toBeInTheDocument()
    await expect(
      (await zoneOf(canvas, "Bez pokoje (2)")).getByText("Matěj Procházka"),
    ).toBeVisible()
  },
}

/** The hard rule includes attendees with no usable value at organizer width. */
export const MissingValueAt1024: Story = {
  globals: { viewport: { value: "organizer1024", isRotated: false } },
  parameters: { placements: WITHOUT_VALUE_STORE },
  play: async ({ canvas }) => {
    await expect(window.innerWidth).toBe(1024)
    const board = await section(canvas)
    await expect(await board.findByText("Bez určující hodnoty")).toBeVisible()
    const width = await zone(canvas, "Chatka 1")
    await expect(width?.scrollWidth ?? 0).toBeLessThanOrEqual(width?.clientWidth ?? 0)
  },
}

/** Nobody has a room yet: placing is optional, everyone is under "Bez pokoje". */
export const WithoutPlacements: Story = {
  parameters: { placements: WITHOUT_PLACEMENTS_STORE },
  play: async ({ canvas }) => {
    const board = await section(canvas)
    await expect(await board.findByRole("heading", { name: "Bez pokoje (10)" })).toBeVisible()
    for (const roomName of ["Chatka 1", "Chatka 2", "Chatka 3", "Srub u lesa"]) {
      await expect((await zoneOf(canvas, roomName)).getByText("Volný")).toBeVisible()
    }
  },
}

/** Dragged to a room without breaking a rule: saved at once, the occupancy follows. */
export const AssignByDrag: Story = {
  play: async ({ canvas }) => {
    await drag(canvas, "Matěj Procházka", "Chatka 2")
    const chatka2 = await zoneOf(canvas, "Chatka 2")
    await expect(await chatka2.findByText("Matěj Procházka")).toBeVisible()
    await expect(chatka2.getByText("3 / 4")).toBeVisible()
    await expect(
      await (await section(canvas)).findByRole("heading", { name: "Bez pokoje (1)" }),
    ).toBeVisible()
  },
}

/** Moved from the menu (keyboard alternative): the original room frees its place. */
export const MoveWithMenu: Story = {
  play: async ({ canvas }) => {
    await pick(canvas, "Jakub Novák", "Přesunout do pokoje", /^Chatka 3/)
    await expect(await (await zoneOf(canvas, "Chatka 3")).findByText("Jakub Novák")).toBeVisible()
    const chatka2 = await zoneOf(canvas, "Chatka 2")
    await expect(await chatka2.findByText("1 / 4")).toBeVisible()
    await expect(chatka2.getByText(/volná místa 3/i)).toBeVisible()
  },
}

/** Removed from the room: back under "Bez pokoje", the place is free again. */
export const RemoveFromRoom: Story = {
  play: async ({ canvas }) => {
    await pick(canvas, "Ondřej Černý", "Odebrat z pokoje")
    await expect(
      await (await zoneOf(canvas, "Bez pokoje (3)")).findByText("Ondřej Černý"),
    ).toBeVisible()
    await expect((await zoneOf(canvas, "Chatka 2")).getByText("1 / 4")).toBeVisible()
  },
}

/** Dragged back to "Bez pokoje" works the same as the menu's removal. */
export const RemoveByDrag: Story = {
  play: async ({ canvas }) => {
    await drag(canvas, "Klára Svobodová", /^Bez pokoje/)
    await expect(
      await (await zoneOf(canvas, "Bez pokoje (3)")).findByText("Klára Svobodová"),
    ).toBeVisible()
  },
}

/** A man into a full room of women: mixed and an extra bed; the exception can be locked. */
export const MixedRoomWarning: Story = {
  play: async ({ canvas }) => {
    await drag(canvas, "Matěj Procházka", "Chatka 1")
    const dialog = await findDialog("Chatka 1")
    await expect(dialog.getByText("Umístění porušuje pravidla pokojů")).toBeVisible()
    await expect(
      dialog.getByText("Pokoj bude smíšený podle pravidla Pohlaví: Žena, Muž."),
    ).toBeVisible()
    await expect(dialog.getByText("Účastník obsadí přistýlku.")).toBeVisible()
    await expect(dialog.getByRole("checkbox", { name: "Zamknout umístění" })).not.toBeChecked()
  },
}

/** Confirmed with the lock: saved despite the warning, locked in the room. */
export const ConfirmAndLock: Story = {
  play: async ({ canvas }) => {
    await drag(canvas, "Matěj Procházka", "Chatka 1")
    const dialog = await findDialog("Chatka 1")
    await userEvent.click(dialog.getByRole("checkbox", { name: "Zamknout umístění" }))
    await userEvent.click(dialog.getByRole("button", { name: "Umístit i přesto" }))
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument())
    const chatka1 = await zoneOf(canvas, "Chatka 1")
    await expect(await chatka1.findByText("5 / 4 + 1")).toBeVisible()
    await expect(chatka1.getByLabelText("Zamčené umístění")).toBeVisible()
    await expect(chatka1.getByText("Smíšený, výjimka")).toBeVisible()
    await expect(chatka1.getByText("Přistýlka")).toBeVisible()
  },
}

/** More people than beds and extra beds: a warning, no lock offered without a mixed room. */
export const OverCapacityWarning: Story = {
  parameters: { placements: NOT_SPLIT_STORE },
  play: async ({ canvas }) => {
    await pick(canvas, "Barbora Veselá", "Umístit do pokoje", /^Srub u lesa/)
    const dialog = await findDialog("Srub u lesa")
    await expect(dialog.getByText("Pokoj překročí kapacitu lůžek a přistýlek.")).toBeVisible()
    await expect(dialog.queryByRole("checkbox")).not.toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Umístit i přesto" }))
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument())
    await expect(
      (await zoneOf(canvas, "Srub u lesa")).getByRole("button", {
        name: /Překročena kapacita/i,
      }),
    ).toBeVisible()
  },
}

/**
 * The first save answers 409 `placement_warnings` with these warnings, as if
 * the room changed meanwhile; later saves reach the in-memory backend. Every
 * request body is recorded.
 */
const roomChangedOnce = (warnings: string[], sent: unknown[]) => {
  let isFirst = true
  return http.put(apiUrl(`${PLACEMENTS}/:registrationId`), async ({ request }) => {
    sent.push(await request.clone().json())
    if (!isFirst) return undefined
    isFirst = false
    return HttpResponse.json(
      { statusCode: 409, code: "placement_warnings", message: "Pravidla pokoje.", warnings },
      { status: 409 },
    )
  })
}

const sentToServerWarning: unknown[] = []

/**
 * The server found a warning the board didn't show (someone else placed
 * meanwhile): the dialog asks about it, and confirming sends exactly the
 * warnings the server reported.
 */
export const WarningFoundByServer: Story = {
  beforeEach: ({ msw }) => {
    sentToServerWarning.length = 0
    msw.use(roomChangedOnce(["over_capacity"], sentToServerWarning))
  },
  play: async ({ canvas }) => {
    await drag(canvas, "Matěj Procházka", "Chatka 2")
    const dialog = await findDialog("Chatka 2")
    await expect(dialog.getByText("Pokoj překročí kapacitu lůžek a přistýlek.")).toBeVisible()
    await expect(
      dialog.getByText("Pokoj se mezitím změnil. Upozornění jsou aktuální."),
    ).toBeVisible()
    await userEvent.click(dialog.getByRole("button", { name: "Umístit i přesto" }))
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument())
    await expect(sentToServerWarning.at(-1)).toMatchObject({ confirmWarnings: ["over_capacity"] })
    await expect(
      await (await zoneOf(canvas, "Chatka 2")).findByText("Matěj Procházka"),
    ).toBeVisible()
  },
}

const sentWhileConfirming: unknown[] = []

/**
 * The room changed while the organizer confirmed: the dialog shows the
 * server's warnings, keeps the chosen lock, and the next confirmation saves
 * the locked exception.
 */
export const RoomChangedWhileConfirming: Story = {
  beforeEach: ({ msw }) => {
    sentWhileConfirming.length = 0
    msw.use(
      // The board's own check opens the dialog first, so the first save is the confirmation.
      roomChangedOnce(["mixed", "extra_bed", "over_capacity"], sentWhileConfirming),
    )
  },
  play: async ({ canvas }) => {
    await drag(canvas, "Matěj Procházka", "Chatka 1")
    let dialog = await findDialog("Chatka 1")
    await userEvent.click(dialog.getByRole("checkbox", { name: "Zamknout umístění" }))
    await userEvent.click(dialog.getByRole("button", { name: "Umístit i přesto" }))
    await expect(
      await dialog.findByText("Pokoj se mezitím změnil. Upozornění jsou aktuální."),
    ).toBeVisible()
    dialog = await findDialog("Chatka 1")
    await expect(dialog.getByText("Pokoj překročí kapacitu lůžek a přistýlek.")).toBeVisible()
    await expect(dialog.getByRole("checkbox", { name: "Zamknout umístění" })).toBeChecked()
    await userEvent.click(dialog.getByRole("button", { name: "Umístit i přesto" }))
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument())
    await expect(sentWhileConfirming.at(-1)).toMatchObject({
      confirmWarnings: ["mixed", "extra_bed", "over_capacity"],
      lock: true,
    })
    await expect(
      await (await zoneOf(canvas, "Chatka 1")).findByLabelText("Zamčené umístění"),
    ).toBeVisible()
  },
}

/** A room turned mixed after placing (a changed answer): a warning nobody confirmed. */
export const RoomTurnedMixed: Story = {
  parameters: { placements: TURNED_MIXED_STORE },
  play: async ({ canvas }) => {
    const chatka2 = await zoneOf(canvas, "Chatka 2")
    await expect(await chatka2.findByText("Smíšený pokoj")).toBeVisible()
    await expect((await zoneOf(canvas, "Srub u lesa")).getByText("Smíšený, výjimka")).toBeVisible()
  },
}

/** Cancelled: nothing is saved, the participant stays without a room. */
export const CancelWarning: Story = {
  play: async ({ canvas }) => {
    await drag(canvas, "Matěj Procházka", "Chatka 1")
    const dialog = await findDialog("Chatka 1")
    await userEvent.click(dialog.getByRole("button", { name: "Zrušit" }))
    await expect(
      (await zoneOf(canvas, "Bez pokoje (2)")).getByText("Matěj Procházka"),
    ).toBeVisible()
  },
}

/** Locked and unlocked from the participant's menu. */
export const LockAndUnlock: Story = {
  play: async ({ canvas }) => {
    await pick(canvas, "Jakub Novák", "Zamknout umístění")
    await expect(
      await (await zoneOf(canvas, "Chatka 2")).findByLabelText("Zamčené umístění"),
    ).toBeVisible()
    await pick(canvas, "Petr Kučera", "Odemknout umístění")
    await waitFor(async () =>
      expect(
        (await zoneOf(canvas, "Srub u lesa")).getAllByLabelText("Zamčené umístění"),
      ).toHaveLength(1),
    )
  },
}

/** A locked placement offers only unlocking: no move, no removal, no drag. */
export const LockedStays: Story = {
  play: async ({ canvas }) => {
    const menu = within(await openPersonMenu(canvas, "Petr Kučera"))
    const unlock = menu.getByRole("menuitem", { name: "Odemknout umístění" })
    await waitFor(() => expect(unlock).toBeVisible())
    await expect(menu.queryByRole("menuitem", { name: "Odebrat z pokoje" })).not.toBeInTheDocument()
    await expect(
      menu.queryByRole("menuitem", { name: "Přesunout do pokoje" }),
    ).not.toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(within(document.body).queryByRole("menu")).not.toBeInTheDocument())
    const item = (await (await section(canvas)).findByText("Petr Kučera")).closest("li")
    await expect(item).toHaveAttribute("draggable", "false")
  },
}

/** A room no longer available in the term keeps its people, takes nobody new. */
export const UnavailableRoom: Story = {
  parameters: { placements: UNAVAILABLE_ROOM_STORE },
  play: async ({ canvas }) => {
    await expect(
      await (await zoneOf(canvas, "Srub u lesa")).findByText("Nedostupný pokoj"),
    ).toBeVisible()
    await openPersonMenu(canvas, "Matěj Procházka")
    const body = within(document.body)
    await userEvent.click(await body.findByRole("menuitem", { name: "Umístit do pokoje" }))
    await expect(await body.findByRole("menuitem", { name: /^Chatka 3/ })).toBeInTheDocument()
    await expect(body.queryByRole("menuitem", { name: /^Srub u lesa/ })).not.toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(body.queryByRole("menu")).not.toBeInTheDocument())
  },
}

/** The confirmed save failed: the dialog stays open with the error, nothing moved. */
export const ConfirmFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${PLACEMENTS}/:registrationId`))
  },
  play: async ({ canvas }) => {
    await drag(canvas, "Matěj Procházka", "Chatka 1")
    const dialog = await findDialog("Chatka 1")
    await userEvent.click(dialog.getByRole("button", { name: "Umístit i přesto" }))
    await expect(await dialog.findByText("Umístění se nepodařilo uložit")).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Umístit i přesto" })).toBeEnabled()
  },
}

/** Rooms are not split: no values shown, people of any answer share a room without a warning. */
export const NotSplit: Story = {
  parameters: { placements: NOT_SPLIT_STORE },
  play: async ({ canvas }) => {
    const board = await section(canvas)
    await expect(await board.findByText("Bez tvrdého pravidla")).toBeVisible()
    await expect(await board.findByText("Matěj Procházka")).toBeVisible()
    await expect(board.queryByText("Muž")).not.toBeInTheDocument()
    await drag(canvas, "Matěj Procházka", "Chatka 3")
    await expect(
      await (await zoneOf(canvas, "Chatka 3")).findByText("Matěj Procházka"),
    ).toBeVisible()
  },
}

export const NoConfirmedParticipants: Story = {
  parameters: { placements: WITHOUT_PEOPLE_STORE },
  play: async ({ canvas }) => {
    await expect(
      await (await section(canvas)).findByText("V termínu nejsou potvrzení účastníci"),
    ).toBeVisible()
  },
}

export const NoRooms: Story = {
  parameters: { placements: WITHOUT_ROOMS_STORE },
  play: async ({ canvas }) => {
    await expect(
      await (await section(canvas)).findByText("V termínu nejsou dostupné pokoje"),
    ).toBeVisible()
  },
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", PLACEMENTS))
  },
  play: async ({ canvas }) => {
    await expect(
      await (await section(canvas)).findByRole("status", { name: "Načítání rozdělení do pokojů" }),
    ).toBeVisible()
  },
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PLACEMENTS))
  },
  play: async ({ canvas }) => {
    await expect(
      await (await section(canvas)).findByText("Rozdělení do pokojů se nepodařilo načíst"),
    ).toBeVisible()
  },
}

/** The placements are not published yet: publishing shows them to the term's participants. */
export const Publish: Story = {
  play: async ({ canvas }) => {
    const board = await section(canvas)
    const toggle = await board.findByRole("switch", { name: "Zveřejnit rozdělení" })
    await expect(toggle).not.toBeChecked()
    await userEvent.click(toggle)
    await showsText("Rozdělení je zveřejněné účastníkům.")
    await waitFor(() => expect(toggle).toBeChecked())
  },
}

/** A published term: taking it back hides the rooms from its participants again. */
export const Unpublish: Story = {
  parameters: { publication: { [OPEN_EVENT.terms[0]!.id]: PUBLISHED_AT } },
  play: async ({ canvas }) => {
    const board = await section(canvas)
    const toggle = await board.findByRole("switch", { name: "Zveřejnit rozdělení" })
    await waitFor(() => expect(toggle).toBeChecked())
    await userEvent.click(toggle)
    await showsText("Zveřejnění rozdělení je zrušené.")
    await waitFor(() => expect(toggle).not.toBeChecked())
  },
}

/** The change failed: the state stays as it was and the organizer can try again. */
export const PublishFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", PUBLICATION))
  },
  play: async ({ canvas }) => {
    const board = await section(canvas)
    const toggle = await board.findByRole("switch", { name: "Zveřejnit rozdělení" })
    await userEvent.click(toggle)
    await showsText("Zveřejnění se nepodařilo změnit. Zkuste to prosím znovu.")
    await expect(toggle).not.toBeChecked()
    await waitFor(() => expect(toggle).toBeEnabled())
  },
}

/** The state failed to load: an error with a retry, never an unpublished switch. */
export const PublicationLoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PUBLICATION))
  },
  play: async ({ canvas }) => {
    const board = await section(canvas)
    await expect(
      await board.findByText("Stav zveřejnění se nepodařilo načíst", undefined, { timeout: 5000 }),
    ).toBeVisible()
    await expect(board.getByRole("button", { name: "Zkusit znovu" })).toBeVisible()
    await expect(
      board.queryByRole("switch", { name: "Zveřejnit rozdělení" }),
    ).not.toBeInTheDocument()
  },
}
