import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { OrganizerEventPage } from "@/not-implemented/OrganizerEventPage"
import { failOn } from "@/screens/msw"

import { ApplyProposalAction } from "@/features/accommodation/components/ApplyProposalAction"
import { RoomProposal } from "@/features/accommodation/components/RoomProposal"
import { EVALUATED_TERM } from "@/features/accommodation/fixtures/evaluation"
import { accommodationHandlers } from "@/features/accommodation/fixtures/handlers"
import {
  makeTermRoomProposal,
  type ProposalPreset,
} from "@/features/accommodation/fixtures/roomProposal"
import { toEvaluationTerm } from "@/features/accommodation/lib/evaluationView"
import { toProposalLayout } from "@/features/accommodation/lib/roomProposalView"

// "Použít návrh" of a room proposal (#390) on Správa akce → Ubytování. The
// button, the review of the changes and the mutation are real and answered
// by MSW with the API contract proposed for #365. The live section gets the
// action with the integration of #26, once the backend can apply proposals.

const TERM = toEvaluationTerm(EVALUATED_TERM)
const APPLY =
  "/organizations/:organizationId/events/:eventId/accommodation/terms/:termId/room-proposal/apply"

function Proposal({ preset }: { preset: ProposalPreset }) {
  const data = makeTermRoomProposal(preset)
  const shown = data.lastSolved
  const layout = shown?.layout ? toProposalLayout(shown.layout) : undefined
  return (
    <OrganizerEventPage
      section="Ubytování"
      crumbs={["Ubytování"]}
    >
      <RoomProposal
        terms={[TERM]}
        selectedTermId={TERM.id}
        mode={data.mode}
        status={data.status}
        attribute="Pohlaví"
        layout={layout}
        proposedAt={shown ? "12. 3. 2027 14:32" : undefined}
        isShownStale={shown ? !shown.isCurrent : false}
        applyAction={
          shown && layout ? (
            <ApplyProposalAction
              organizationId="org"
              eventId="event"
              termId={TERM.id}
              term={`${TERM.label}, ${TERM.dates}`}
              proposalId={shown.id}
              layout={layout}
              onPropose={() => undefined}
            />
          ) : null
        }
      />
    </OrganizerEventPage>
  )
}

const meta = {
  title: "Not implemented/F19 Apply room proposal",
  component: Proposal,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { preset: "withSaved" },
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.roomProposal())
  },
} satisfies Meta<typeof Proposal>

export default meta

type Story = StoryObj<typeof meta>

const openDialog = async (canvasElement: HTMLElement) => {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Použít návrh" }))
  const dialog = await within(document.body).findByRole("dialog", {
    name: "Použít návrh pokojů",
  })
  // The dialog fades in; checks start once it is shown.
  await waitFor(() => expect(dialog).toBeVisible())
  return within(dialog)
}

/** Before applying: new placements, a move and a lost room against the saved ones. */
export const ReviewChanges: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement)
    await expect(dialog.getByText("Nová umístění (2)")).toBeVisible()
    await expect(dialog.getByText("Jan Dvořák: Chata Dub → Chata Buk")).toBeVisible()
    await expect(dialog.getByText("Tomáš Král: Chata Buk")).toBeVisible()
    await expect(
      dialog.getByText("Zamčená umístění, účast ani zveřejnění pokojů se nezmění."),
    ).toBeVisible()
  },
}

/** Applied in one step: the dialog closes (on the page, a toast confirms it). */
export const Applied: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement)
    await userEvent.click(dialog.getByRole("button", { name: "Použít návrh" }))
    // The preview has no toaster; the dialog closes on success.
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument())
  },
}

/** The term changed since the proposal: refused, nothing saved, a new proposal offered. */
export const RefusedAsStale: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", APPLY, 409, { code: "proposal_stale" }))
  },
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement)
    await userEvent.click(dialog.getByRole("button", { name: "Použít návrh" }))
    await expect(
      await dialog.findByText("Návrh pokojů je neaktuální, nic se neuložilo"),
    ).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Navrhnout pokoje" })).toBeVisible()
  },
}

/** Saving failed: the saved placements stay and the apply can be repeated. */
export const SaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", APPLY))
  },
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement)
    await userEvent.click(dialog.getByRole("button", { name: "Použít návrh" }))
    await expect(await dialog.findByText("Návrh se nepodařilo použít")).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Použít návrh" })).toBeEnabled()
  },
}

/** A stale proposal cannot be applied: no button, a new proposal first. */
export const StaleProposal: Story = {
  args: { preset: "stale" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Podklady se od návrhu změnily")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Použít návrh" })).not.toBeInTheDocument()
  },
}

/** Nothing would change against the saved placements: no button. */
export const NothingToApply: Story = {
  args: { preset: "empty" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("V termínu nejsou potvrzení účastníci")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Použít návrh" })).not.toBeInTheDocument()
  },
}
