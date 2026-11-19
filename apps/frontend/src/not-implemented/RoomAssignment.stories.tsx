import { useState } from "react"
import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { OrganizerEventPage } from "@/not-implemented/OrganizerEventPage"
import { failOn, neverAnswer } from "@/screens/msw"
import { openRowMenu } from "@/screens/steps"

import type { TermPlacements } from "@/features/accommodation/api/placementSchemas"
import { RoomAssignmentSection } from "@/features/accommodation/components/RoomAssignmentSection"
import { placementHandlers, PLACEMENTS } from "@/features/accommodation/fixtures/placementHandlers"
import {
  PLACEMENT_TERM,
  TERM_NOT_SPLIT,
  TERM_PLACEMENTS,
  TERM_WITHOUT_PEOPLE,
  TERM_WITHOUT_PLACEMENTS,
  TERM_WITHOUT_ROOMS,
} from "@/features/accommodation/fixtures/placements"

// Manual room placements of a term (F14-2) on Správa akce → Ubytování. The
// section, its saves and the warnings are real and answered by MSW with the
// API contract proposed for #337, which keeps every save in memory. The live
// page gets the section with the integration of #20.

function Assignment() {
  const [termId, setTermId] = useState(PLACEMENT_TERM.id)
  return (
    <OrganizerEventPage
      section="Ubytování"
      crumbs={["Ubytování"]}
    >
      <RoomAssignmentSection
        organizationId="org"
        eventId="event"
        terms={[PLACEMENT_TERM]}
        selectedTermId={termId}
        onSelectTerm={setTermId}
      />
    </OrganizerEventPage>
  )
}

const meta = {
  title: "Not implemented/F14-2 Room assignment",
  component: Assignment,
  parameters: { layout: "fullscreen", placements: TERM_PLACEMENTS },
  globals: { viewport: { value: "desktop", isRotated: false } },
  beforeEach: ({ msw, parameters }) => {
    msw.use(...placementHandlers(parameters.placements as TermPlacements))
  },
} satisfies Meta<typeof Assignment>

export default meta

type Story = StoryObj<typeof meta>

type Canvas = StoryContext["canvas"]

/** The card of a room, or of "Bez pokoje". */
const zone = async (canvas: Canvas, name: string | RegExp) => {
  const heading = await canvas.findByRole("heading", { name })
  const card = heading.closest<HTMLElement>('[data-slot="card"]')
  if (!card) throw new Error(`No card for ${String(name)}`)
  return card
}

const zoneOf = async (canvas: Canvas, name: string | RegExp) => within(await zone(canvas, name))

/** Drags the participant onto the room's card, as the browser does. */
const drag = async (canvas: Canvas, person: string, target: string | RegExp) => {
  const item = (await canvas.findByText(person)).closest("li")
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
  await openRowMenu(canvas, person)
  const body = within(document.body)
  for (const item of items) {
    await userEvent.click(await body.findByRole("menuitem", { name: item }))
  }
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const chatka1 = await zoneOf(canvas, "Chatka 1")
    await expect(chatka1.getByText("4 / 4 + 1")).toBeVisible()
    await expect(chatka1.getByText("Volná místa: 1")).toBeVisible()
    await expect((await zoneOf(canvas, "Chatka 3")).getByText("Volný")).toBeVisible()
    await expect(
      (await zoneOf(canvas, "Srub u lesa")).getAllByLabelText("Zamčené umístění"),
    ).toHaveLength(2)
    await expect(
      (await zoneOf(canvas, "Bez pokoje (2)")).getByText("Matěj Procházka"),
    ).toBeVisible()
  },
}

/** Nobody has a room yet: placing is optional, everyone is under "Bez pokoje". */
export const WithoutPlacements: Story = {
  parameters: { placements: TERM_WITHOUT_PLACEMENTS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("heading", { name: "Bez pokoje (10)" })).toBeVisible()
    await expect(canvas.getAllByText("Volný")).toHaveLength(4)
  },
}

/** Dragged to a room without breaking a rule: saved at once, the occupancy follows. */
export const AssignByDrag: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await drag(canvas, "Matěj Procházka", "Chatka 2")
    const chatka2 = await zoneOf(canvas, "Chatka 2")
    await expect(await chatka2.findByText("Matěj Procházka")).toBeVisible()
    await expect(chatka2.getByText("3 / 4")).toBeVisible()
    await expect(await canvas.findByRole("heading", { name: "Bez pokoje (1)" })).toBeVisible()
  },
}

/** Moved from the menu (keyboard alternative): the original room frees its place. */
export const MoveWithMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await pick(canvas, "Jakub Novák", "Přesunout do pokoje", /^Chatka 3/)
    await expect(await (await zoneOf(canvas, "Chatka 3")).findByText("Jakub Novák")).toBeVisible()
    const chatka2 = await zoneOf(canvas, "Chatka 2")
    await expect(await chatka2.findByText("1 / 4")).toBeVisible()
    await expect(chatka2.getByText("Volná místa: 3")).toBeVisible()
  },
}

/** Removed from the room: back under "Bez pokoje", the place is free again. */
export const RemoveFromRoom: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await pick(canvas, "Ondřej Černý", "Odebrat z pokoje")
    await expect(
      await (await zoneOf(canvas, "Bez pokoje (3)")).findByText("Ondřej Černý"),
    ).toBeVisible()
    await expect((await zoneOf(canvas, "Chatka 2")).getByText("1 / 4")).toBeVisible()
  },
}

/** Dragged back to "Bez pokoje" works the same as the menu's removal. */
export const RemoveByDrag: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await drag(canvas, "Klára Svobodová", /^Bez pokoje/)
    await expect(
      await (await zoneOf(canvas, "Bez pokoje (3)")).findByText("Klára Svobodová"),
    ).toBeVisible()
  },
}

/** A man into a full room of women: mixed and an extra bed; the exception can be locked. */
export const MixedRoomWarning: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await drag(canvas, "Matěj Procházka", "Chatka 1")
    const dialog = await findDialog("Chatka 1")
    await userEvent.click(dialog.getByRole("checkbox", { name: "Zamknout umístění" }))
    await userEvent.click(dialog.getByRole("button", { name: "Umístit i přesto" }))
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument())
    const chatka1 = await zoneOf(canvas, "Chatka 1")
    await expect(await chatka1.findByText("5 / 4 + 1")).toBeVisible()
    await expect(chatka1.getByLabelText("Zamčené umístění")).toBeVisible()
  },
}

/** More people than beds and extra beds: a warning, no lock offered without a mixed room. */
export const OverCapacityWarning: Story = {
  parameters: { placements: TERM_NOT_SPLIT },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await pick(canvas, "Barbora Veselá", "Umístit do pokoje", /^Srub u lesa/)
    const dialog = await findDialog("Srub u lesa")
    await expect(dialog.getByText("Pokoj překročí kapacitu lůžek a přistýlek.")).toBeVisible()
    await expect(dialog.queryByRole("checkbox")).not.toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Umístit i přesto" }))
    const srub = await zoneOf(canvas, "Srub u lesa")
    await expect(await srub.findByText("Překročena kapacita")).toBeVisible()
  },
}

/** Cancelled: nothing is saved, the participant stays without a room. */
export const CancelWarning: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
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

/** The confirmed save failed: the dialog stays open with the error, nothing moved. */
export const ConfirmFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${PLACEMENTS}/:registrationId`))
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await drag(canvas, "Matěj Procházka", "Chatka 1")
    const dialog = await findDialog("Chatka 1")
    await userEvent.click(dialog.getByRole("button", { name: "Umístit i přesto" }))
    await expect(await dialog.findByText("Umístění se nepodařilo uložit")).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Umístit i přesto" })).toBeEnabled()
  },
}

/** Rooms are not split: no values shown, people of any answer share a room without a warning. */
export const NotSplit: Story = {
  parameters: { placements: TERM_NOT_SPLIT },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Matěj Procházka")).toBeVisible()
    await expect(canvas.queryByText("Muž")).not.toBeInTheDocument()
    await drag(canvas, "Matěj Procházka", "Chatka 3")
    await expect(
      await (await zoneOf(canvas, "Chatka 3")).findByText("Matěj Procházka"),
    ).toBeVisible()
  },
}

export const NoConfirmedParticipants: Story = {
  parameters: { placements: TERM_WITHOUT_PEOPLE },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("V termínu nejsou potvrzení účastníci"),
    ).toBeVisible()
  },
}

export const NoRooms: Story = {
  parameters: { placements: TERM_WITHOUT_ROOMS },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("V termínu nejsou dostupné pokoje"),
    ).toBeVisible()
  },
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", PLACEMENTS))
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("status", { name: "Načítání rozdělení do pokojů" }),
    ).toBeVisible()
  },
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PLACEMENTS))
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("Rozdělení do pokojů se nepodařilo načíst"),
    ).toBeVisible()
  },
}
