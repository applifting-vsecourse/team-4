import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, userEvent, within } from "storybook/test"

import { apiUrl, failOn, failsOnRefresh } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { openDialog, refresh, showsText } from "@/screens/steps"

import { OPEN_EVENT } from "@/features/events/fixtures/events"
import { eventHandlers } from "@/features/events/fixtures/handlers"
import { ROOMS_OVERVIEW } from "@/features/rooms/fixtures/rooms"

const ROOMS = "/organizations/:organizationId/events/:eventId/rooms"
const [JULY] = ROOMS_OVERVIEW.terms

const meta = {
  title: "Screens/Event/Rooms",
  ...screenMeta,
  args: { url: eventUrl("/rooms") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

const overview = (rooms: typeof ROOMS_OVERVIEW.rooms) => [
  http.get(apiUrl(ROOMS), () => HttpResponse.json({ ...ROOMS_OVERVIEW, rooms })),
]

/** Rooms, beds and occupancy per term (S2-05, S2-10). */
export const Rooms: Story = { play: showsHeading("Pokoje") }

export const NoRooms: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...overview([]))
  },
  play: () => showsText("Zatím žádné pokoje"),
}

export const AddRoomDialog: Story = {
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Přidat pokoj", "Nový pokoj")
    await expect(within(dialog).getByLabelText("Označení")).toBeVisible()
  },
}

export const RoomSaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${ROOMS}/:roomId`))
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Upravit pokoj Chatka 1")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit" }))
    await showsText("Pokoj se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

/** Fewer beds than confirmed participants: refused, with the terms affected. */
export const BelowConfirmed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...failOn("put", `${ROOMS}/:roomId`, 409, {
        code: "capacity_below_confirmed",
        conflicts: [
          {
            termId: JULY!.id,
            termLabel: JULY!.label,
            proposedCapacity: 22,
            confirmedParticipants: 23,
          },
        ],
      }),
    )
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Upravit pokoj Chatka 1")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit" }))
    await showsText("Změnu nelze uložit")
  },
}

export const DeleteRoomDialog: Story = {
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Odstranit pokoj Chatka 1")
    await expect(within(dialog).getByRole("button", { name: "Odstranit" })).toBeVisible()
  },
}

export const DeleteRoomFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("delete", `${ROOMS}/:roomId`))
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Odstranit pokoj Chatka 1")
    await userEvent.click(within(dialog).getByRole("button", { name: "Odstranit" }))
    await showsText("Pokoj se nepodařilo odstranit. Zkuste to prosím znovu.")
  },
}

/** A refresh failed: the last occupancy stays, with its time. */
export const RefreshFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failsOnRefresh("get", ROOMS, ROOMS_OVERVIEW))
  },
  play: async ({ canvas }) => {
    await refresh(canvas)
    await showsText("Aktualizace se nezdařila")
  },
}

/** No term yet: rooms have nowhere to be available, occupancy has nothing to show. */
export const NoTerms: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...eventHandlers.detail({ ...OPEN_EVENT, terms: [] }),
      http.get(apiUrl(ROOMS), () => HttpResponse.json({ rooms: [], terms: [] })),
    )
  },
  play: async () => {
    await showsText("Akce zatím nemá žádné termíny")
    await showsText(/pokoje tedy nemají kde být dostupné/)
  },
}
