import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor, within } from "storybook/test"

import { OrganizerEventPage } from "@/not-implemented/OrganizerEventPage"
import { failOn, neverAnswer } from "@/screens/msw"

import type { TermRoomProposalData } from "@/features/accommodation/api/roomProposalSchemas"
import { RoommateWishStatesSection } from "@/features/accommodation/components/RoommateWishStatesSection"
import { EVALUATED_TERM } from "@/features/accommodation/fixtures/evaluation"
import { accommodationHandlers } from "@/features/accommodation/fixtures/handlers"
import {
  makeTermRoomProposal,
  makeTermWishes,
  type WishesPreset,
} from "@/features/accommodation/fixtures/roomProposal"

// Přání na spolubydlící (#317) on Správa akce → Ubytování → vybraný termín:
// the state of each wish in the saved placements and in the room proposal.
// The section and its queries are real, answered by MSW with the wishes
// contract proposed for #339/#337; the live page gets the section with the
// integration of #26, once wishes and saved placements are stored.

const WISHES =
  "/organizations/:organizationId/events/:eventId/accommodation/terms/:termId/roommate-wishes"

function Wishes() {
  return (
    <OrganizerEventPage
      section="Ubytování"
      crumbs={["Ubytování"]}
    >
      <RoommateWishStatesSection
        organizationId="org"
        eventId="event"
        termId={EVALUATED_TERM.id}
        attribute="Pohlaví"
      />
    </OrganizerEventPage>
  )
}

const meta = {
  title: "Not implemented/F19 Roommate wish states",
  component: Wishes,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.roomProposal())
  },
} satisfies Meta<typeof Wishes>

export default meta

type Story = StoryObj<typeof meta>

const backend = (
  wishes: WishesPreset,
  proposal?: TermRoomProposalData,
): Pick<Story, "beforeEach"> => ({
  beforeEach: ({ msw }) => {
    msw.use(
      ...accommodationHandlers.termWishes(makeTermWishes(wishes)),
      ...(proposal ? accommodationHandlers.termRoomProposal(proposal) : []),
    )
  },
})

/** The row of the wish from one person, by a name that appears once. */
const rowOf = async (canvasElement: HTMLElement, name: string) => {
  const canvas = within(canvasElement)
  return within((await canvas.findByRole("cell", { name })).closest("tr")!)
}

/** Saved placements and a current proposal: each state in its own column. */
export const SavedAndProposal: Story = {
  ...backend("saved", makeTermRoomProposal("current")),
  play: async ({ canvasElement }) => {
    const eliska = await rowOf(canvasElement, "Eliška Malá")
    // The proposal column fills in once the term's proposal is read.
    await waitFor(() => expect(eliska.getAllByText("Nesplněno")).toHaveLength(2))
    const tomas = await rowOf(canvasElement, "Tomáš Král")
    await expect(tomas.getByText("Nesplněno")).toBeVisible()
    await expect(await tomas.findByText("Čeká na umístění")).toBeVisible()
    const petr = await rowOf(canvasElement, "Petr Svoboda")
    await waitFor(() =>
      expect(petr.getAllByText("Nelze splnit: různá hodnota Pohlaví")).toHaveLength(2),
    )
  },
}

/** Nobody has a saved room yet: every wish waits; the proposal shows what it would do. */
export const NothingSaved: Story = {
  ...backend("unsaved", makeTermRoomProposal("current")),
  play: async ({ canvasElement }) => {
    const eliska = await rowOf(canvasElement, "Eliška Malá")
    await expect(eliska.getByText("Čeká na umístění")).toBeVisible()
    await expect(await eliska.findByText("Nesplněno")).toBeVisible()
  },
}

/** The term changed after the proposal: its column says it is out of date. */
export const StaleProposal: Story = {
  ...backend("saved", makeTermRoomProposal("stale")),
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(
        "Podle návrhu: poslední dokončený návrh, podklady se od něj změnily.",
      ),
    ).toBeVisible()
  },
}

/** No proposal yet: only the saved state. */
export const NoProposal: Story = {
  ...backend("saved", makeTermRoomProposal("none")),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Termín zatím nemá návrh pokojů.")).toBeVisible()
    await expect(await canvas.findAllByText("Bez návrhu")).toHaveLength(4)
  },
}

/** No usable wish between two people confirmed in the term. */
export const NoWishes: Story = {
  ...backend("empty"),
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("V termínu nejsou přání na spolubydlící"),
    ).toBeVisible()
  },
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", WISHES))
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByRole("status", { name: "Načítání přání na spolubydlící" }),
    ).toBeVisible()
  },
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", WISHES))
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("Přání na spolubydlící se nepodařilo načíst"),
    ).toBeVisible()
  },
}

/** The proposal could not be read: the saved state stays, its column says why, with a retry. */
export const ProposalLoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...failOn(
        "get",
        "/organizations/:organizationId/events/:eventId/accommodation/terms/:termId/room-proposal",
      ),
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Návrh pokojů se nepodařilo načíst")).toBeVisible()
    await expect(await canvas.findAllByText("Nenačteno")).toHaveLength(4)
    await expect(canvas.queryByText("Termín zatím nemá návrh pokojů.")).not.toBeInTheDocument()
    const eliska = await rowOf(canvasElement, "Eliška Malá")
    await expect(eliska.getByText("Nesplněno")).toBeVisible()
  },
}
