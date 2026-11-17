import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, userEvent, within } from "storybook/test"

import { apiUrl, failOn, failsOnRefresh, neverAnswer } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { openDialog, refresh, showsText } from "@/screens/steps"

import type { TermRoomProposalData } from "@/features/accommodation/api/roomProposalSchemas"
import { accommodationHandlers } from "@/features/accommodation/fixtures/handlers"
import {
  makeTermRoomProposal,
  type ProposalPreset,
} from "@/features/accommodation/fixtures/roomProposal"
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
export const Rooms: Story = {
  play: async (context) => {
    await showsHeading("Pokoje")(context)
    // The context "Nastavení" opens the event settings at Návrh pokojů (#384, #389).
    const settings = context.canvas.getAllByRole("link", { name: "Nastavení" })
    await expect(
      settings
        .map((link) => link.getAttribute("href"))
        .filter((href) => href?.endsWith("/settings#room-proposal-settings-heading")),
    ).toHaveLength(1)
  },
}

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

// ─── Návrh pokojů (#385) ────────────────────────────────────────────────────

const PROPOSAL =
  "/organizations/:organizationId/events/:eventId/accommodation/terms/:termId/room-proposal"

/** The room proposal of the selected term in one fixture state. */
const proposalStory = (
  preset: ProposalPreset,
  text: string | RegExp,
  overrides: Partial<TermRoomProposalData> = {},
): Story => ({
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.termRoomProposal(makeTermRoomProposal(preset, overrides)))
  },
  play: async ({ canvas }) => {
    const section = within(await canvas.findByRole("region", { name: "Návrh pokojů" }))
    await expect(await section.findByText(text)).toBeVisible()
  },
})

/** A current proposal: rooms with their people, one person without a room (H). */
export const Proposal: Story = {
  play: async ({ canvas, userEvent: user }) => {
    const section = within(await canvas.findByRole("region", { name: "Návrh pokojů" }))
    await expect(await section.findByText("Aktuální návrh")).toBeVisible()
    // The term is in the URL; switching it stays on Ubytování.
    const [first, second] = section.getAllByRole("tab")
    await expect(first).toHaveAttribute("aria-selected", "true")
    await user.click(second!)
    await expect(second).toHaveAttribute("aria-selected", "true")
  },
}

/** Against saved placements: a move, a locked placement, a lost room and a lock conflict. */
export const ProposalWithSavedPlacements = proposalStory("withSaved", "Přesun z Chata Dub")

/** U2–U7 ran out of time: the valid layout is shown with a warning. */
export const ProposalPartial = proposalStory("incomplete", "Rozdělení nemusí být nejlepší možné")

/** A layout change after the proposal. */
export const ProposalStale = proposalStory("stale", "Podklady se od návrhu změnily")

/** Automatic mode: a stale proposal is replaced on its own. */
export const ProposalStaleAutomatic = proposalStory("stale", /Nový návrh vznikne automaticky/, {
  mode: "automatic",
})

/** A proposal runs; the last one stays shown. */
export const ProposalRunning: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.termRoomProposal(makeTermRoomProposal("running")))
  },
  play: async ({ canvas }) => {
    const section = within(await canvas.findByRole("region", { name: "Návrh pokojů" }))
    await expect(await section.findByRole("button", { name: "Navrhuje se…" })).toBeDisabled()
    await expect(section.getByText("Chata Javor")).toBeVisible()
  },
}

/** The first proposal of the term runs: nothing below yet. */
export const ProposalRunningFirst: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.termRoomProposal(makeTermRoomProposal("runningFirst")))
  },
  play: async ({ canvas }) => {
    const section = within(await canvas.findByRole("region", { name: "Návrh pokojů" }))
    await expect(await section.findByRole("button", { name: "Navrhuje se…" })).toBeDisabled()
  },
}

/** An automatic proposal runs after a layout change. */
export const ProposalRunningAutomatic = proposalStory("running", /Automatický návrh zapnutý/, {
  mode: "automatic",
})

/** The term was never proposed; "Navrhnout pokoje" starts one. */
export const NoProposal: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.termRoomProposal(makeTermRoomProposal("none")))
  },
  play: async ({ canvas, userEvent: user }) => {
    const section = within(await canvas.findByRole("region", { name: "Návrh pokojů" }))
    await expect(
      await section.findByText("Vytvořte návrh tlačítkem Navrhnout pokoje."),
    ).toBeVisible()
    await user.click(section.getByRole("button", { name: "Navrhnout pokoje" }))
    await expect(await section.findByRole("button", { name: "Navrhuje se…" })).toBeDisabled()
  },
}

/** The term was never proposed, automatic mode. */
export const NoProposalAutomatic = proposalStory(
  "none",
  /Návrh vznikne automaticky po změně podkladů/,
  { mode: "automatic" },
)

/** No confirmed participant in the term. */
export const ProposalNoConfirmed = proposalStory("empty", "V termínu nejsou potvrzení účastníci")

/** No room is available in the term: everyone has the reason N. */
export const ProposalNoRooms = proposalStory("noRooms", "Termín nemá dostupný pokoj")

/** The proposal failed: a retry, and the last finished proposal below. */
export const ProposalFailed = proposalStory("failed", "Níže je poslední dokončený návrh.")

/** It failed after a layout change: the last finished proposal is out of date. */
export const ProposalFailedAfterChange = proposalStory(
  "failedStale",
  "Níže je poslední dokončený návrh; podklady se od něj změnily.",
)

/** U1 did not finish in time: nothing usable, a retry. */
export const ProposalTimeout = proposalStory("timeout", /Návrh pokojů nedoběhl v časovém limitu/)

/** A locked room left as it is (O5): more locked people than beds. */
export const ProposalLockedRoomWarning: Story = (() => {
  const data = makeTermRoomProposal("withSaved")
  const proposal = data.proposal!
  const layout = proposal.layout!
  const warned = {
    ...proposal,
    layout: {
      ...layout,
      rooms: layout.rooms.map((room, index) =>
        index === 2 ? { ...room, warning: "overCapacity" as const } : room,
      ),
    },
  }
  return proposalStory(
    "withSaved",
    "Zamčených osob je víc než lůžek. Návrh pokoj ponechá a nikoho nepřidá.",
    { proposal: warned, lastSolved: warned },
  )
})()

/** "Navrhnout pokoje" could not start; the shown proposal stays. */
export const ProposeFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", PROPOSAL))
  },
  play: async ({ canvas, userEvent: user }) => {
    const section = within(await canvas.findByRole("region", { name: "Návrh pokojů" }))
    await user.click(await section.findByRole("button", { name: "Navrhnout pokoje" }))
    await showsText("Návrh pokojů se nepodařilo spustit")
    await expect(section.getByText("Aktuální návrh")).toBeVisible()
  },
}

export const ProposalLoading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", PROPOSAL))
  },
  play: async ({ canvas }) => {
    const section = within(await canvas.findByRole("region", { name: "Návrh pokojů" }))
    await expect(await section.findByRole("status")).toBeVisible()
  },
}

export const ProposalLoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PROPOSAL))
  },
  play: () => showsText("Návrh pokojů se nepodařilo načíst"),
}
