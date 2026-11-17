import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { OrganizerEventPage } from "@/not-implemented/OrganizerEventPage"

import {
  RoomProposal,
  type RoomProposalProps,
} from "@/features/accommodation/components/RoomProposal"
import { RoomProposalModeSettings } from "@/features/accommodation/components/RoomProposalModeSettings"
import { EVALUATED_TERM } from "@/features/accommodation/fixtures/evaluation"
import {
  makeTermRoomProposal,
  type ProposalPreset,
} from "@/features/accommodation/fixtures/roomProposal"
import { toEvaluationTerm } from "@/features/accommodation/lib/evaluationView"
import { toProposalLayout } from "@/features/accommodation/lib/roomProposalView"

// The room proposal of a term (#385) in Správa akce → Ubytování, and its
// automation setting beside the evaluation mode in Nastavení → Automatizace.
// The components are real; the page around them and the route wiring come
// with the integration of #26, so every value here is passed in.

const TERMS = [
  toEvaluationTerm(EVALUATED_TERM),
  toEvaluationTerm({
    id: "0190c0de-0000-7000-8000-000000000102",
    label: "Turnus 2",
    startDate: "2027-07-18",
    endDate: "2027-07-31",
  }),
]

/** The design props of one fixture state, as the section passes them. */
function propsOf(preset: ProposalPreset): Omit<RoomProposalProps, "terms" | "selectedTermId"> {
  const data = makeTermRoomProposal(preset)
  const shown = data.lastSolved
  return {
    mode: data.mode,
    status: data.status,
    layout: shown?.layout ? toProposalLayout(shown.layout) : undefined,
    proposedAt: shown ? "12. 3. 2027 14:32" : undefined,
  }
}

function Proposal(props: Omit<RoomProposalProps, "terms" | "selectedTermId">) {
  return (
    <OrganizerEventPage
      section="Ubytování"
      crumbs={["Ubytování"]}
    >
      <RoomProposal
        terms={TERMS}
        selectedTermId={EVALUATED_TERM.id}
        {...props}
      />
    </OrganizerEventPage>
  )
}

const meta = {
  title: "Not implemented/F19 Room proposal",
  component: Proposal,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: propsOf("current"),
} satisfies Meta<typeof Proposal>

export default meta

type Story = StoryObj<typeof meta>

const shows =
  (text: string | RegExp) =>
  async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await expect(await within(canvasElement).findByText(text)).toBeVisible()
  }

/** A current proposal: rooms with their people, one person without a room (H). */
export const Current: Story = { play: shows("Aktuální návrh") }

/** Against saved placements: a move, a locked placement, a lost room and a lock conflict. */
export const WithSavedPlacements: Story = {
  args: propsOf("withSaved"),
  play: shows("Přesun z Chata Dub"),
}

/** U2–U7 ran out of time: the valid layout is shown with a warning. */
export const PartialResult: Story = {
  args: propsOf("incomplete"),
  play: shows("Rozdělení nemusí být nejlepší možné"),
}

/** A layout change after the proposal. */
export const Stale: Story = {
  args: propsOf("stale"),
  play: shows("Podklady se od návrhu změnily"),
}

/** Automatic mode: a stale proposal is replaced on its own. */
export const StaleAutomatic: Story = {
  args: { ...propsOf("stale"), mode: "automatic" },
  play: shows(/Nový návrh vznikne automaticky/),
}

/** A proposal runs (manual or automatic); the last one stays shown. */
export const Running: Story = {
  args: propsOf("running"),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "Navrhuje se…" })).toBeDisabled()
  },
}

/** The term was never proposed, manual mode. */
export const NoProposal: Story = {
  args: propsOf("none"),
  play: shows("Vytvořte návrh tlačítkem Navrhnout pokoje."),
}

/** The term was never proposed, automatic mode. */
export const NoProposalAutomatic: Story = {
  args: { ...propsOf("none"), mode: "automatic" },
  play: shows(/Návrh vznikne automaticky po změně podkladů/),
}

/** No confirmed participant in the term. */
export const NoConfirmed: Story = {
  args: propsOf("empty"),
  play: shows("V termínu zatím nejsou potvrzení účastníci"),
}

/** The proposal failed: a retry, and the last finished proposal below. */
export const Failed: Story = {
  args: propsOf("failed"),
  play: shows("Návrh pokojů se nezdařil"),
}

/** U1 did not finish in time: nothing usable, a retry. */
export const Timeout: Story = {
  args: propsOf("timeout"),
  play: shows("Návrh pokojů nedoběhl v časovém limitu"),
}

/** "Navrhnout pokoje" could not start; the shown proposal stays. */
export const ProposeFailed: Story = {
  args: { ...propsOf("current"), proposeError: "Zkuste to prosím znovu." },
  play: shows("Návrh pokojů se nepodařilo spustit"),
}

/** A locked room left as it is (O5): mixed groups or more people than beds. */
export const LockedRoomWarning: Story = {
  args: (() => {
    const props = propsOf("withSaved")
    const layout = props.layout!
    return {
      ...props,
      layout: {
        ...layout,
        rooms: layout.rooms.map((room, index) =>
          index === 2 ? { ...room, warning: "overCapacity" as const } : room,
        ),
      },
    }
  })(),
  play: shows("Zamčených osob je víc než lůžek. Návrh pokoj ponechá a nikoho nepřidá."),
}

export const Loading: Story = { args: { ...propsOf("none"), isLoading: true } }

export const LoadFailed: Story = {
  args: { ...propsOf("none"), isLoadFailed: true },
  play: shows("Návrh pokojů se nepodařilo načíst"),
}

/** Nastavení → Automatizace: the room proposal mode, independent of the evaluation mode. */
export const AutomationSetting: StoryObj<typeof RoomProposalModeSettings> = {
  render: (args) => (
    <OrganizerEventPage
      section="Nastavení"
      crumbs={["Nastavení"]}
      title="Nastavení"
    >
      <RoomProposalModeSettings {...args} />
    </OrganizerEventPage>
  ),
  args: { mode: "manual" },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("radio", {
        name: "Navrhnout pokoje jen tlačítkem Navrhnout pokoje",
      }),
    ).toBeChecked()
  },
}

export const AutomationSaveFailed: StoryObj<typeof RoomProposalModeSettings> = {
  ...AutomationSetting,
  args: { mode: "manual", saveError: "Pokoje se dál navrhují jen tlačítkem Navrhnout pokoje." },
  play: shows("Režim návrhu pokojů se nepodařilo uložit"),
}
