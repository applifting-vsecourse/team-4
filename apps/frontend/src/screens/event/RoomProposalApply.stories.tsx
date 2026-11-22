import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { failOn } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { accommodationHandlers } from "@/features/accommodation/fixtures/handlers"
import {
  makeTermRoomProposal,
  type ProposalPreset,
} from "@/features/accommodation/fixtures/roomProposal"

// Správa akce → Ubytování → Návrh pokojů → "Použít návrh" (#390): the review
// of the changes against the saved placements and the one explicit step that
// saves them (#365). MSW answers with the backend's contract.

const APPLY =
  "/organizations/:organizationId/events/:eventId/accommodation/terms/:termId/room-proposal/apply"

const withProposal = (preset: ProposalPreset): Pick<Story, "beforeEach"> => ({
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.termRoomProposal(makeTermRoomProposal(preset)))
  },
})

const meta = {
  title: "Screens/Event/Room Proposal Apply",
  ...screenMeta,
  args: { url: eventUrl("/rooms?tab=split&view=proposal") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
    msw.use(...accommodationHandlers.termRoomProposal(makeTermRoomProposal("withSaved")))
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

type Canvas = StoryContext["canvas"]

const proposal = async (canvas: Canvas) =>
  within(await canvas.findByRole("region", { name: "Návrh pokojů" }, { timeout: 5000 }))

const openDialog = async (canvas: Canvas) => {
  const section = await proposal(canvas)
  await userEvent.click(await section.findByRole("button", { name: "Použít návrh" }))
  const dialog = await within(document.body).findByRole("dialog", {
    name: "Použít návrh pokojů",
  })
  // The dialog fades in; checks start once it is shown.
  await waitFor(() => expect(dialog).toBeVisible())
  return within(dialog)
}

/** Before applying: new placements, a move and a lost room against the saved ones. */
export const ReviewChanges: Story = {
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas)
    await expect(dialog.getByText("Nová umístění (2)")).toBeVisible()
    await expect(dialog.getByText("Jan Dvořák: Chata Dub → Chata Buk")).toBeVisible()
    await expect(dialog.getByText("Tomáš Král: Chata Buk")).toBeVisible()
    await expect(
      dialog.getByText("Zamčená umístění, účast ani zveřejnění pokojů se nezmění."),
    ).toBeVisible()
  },
}

/** Applied in one step: the dialog closes and a toast confirms it. */
export const Applied: Story = {
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas)
    await userEvent.click(dialog.getByRole("button", { name: "Použít návrh" }))
    await showsText("Návrh pokojů byl použit.")
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument())
    await expect(await canvas.findByRole("region", { name: "Uložené rozdělení" })).toBeVisible()
    await expect(
      canvas.queryByRole("button", { name: "Zpět na uložené rozdělení" }),
    ).not.toBeInTheDocument()
    await expect(await canvas.findByRole("switch", { name: "Zveřejnit rozdělení" })).toBeVisible()
  },
}

/** The term changed since the proposal: refused, nothing saved, a new proposal offered. */
export const RefusedAsStale: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", APPLY, 409, { code: "proposal_stale" }))
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas)
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
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas)
    await userEvent.click(dialog.getByRole("button", { name: "Použít návrh" }))
    await expect(await dialog.findByText("Návrh se nepodařilo použít")).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Použít návrh" })).toBeEnabled()
  },
}

/** A stale proposal cannot be applied: no button, a new proposal first. */
export const StaleProposal: Story = {
  ...withProposal("stale"),
  play: async ({ canvas }) => {
    const section = await proposal(canvas)
    await expect(await section.findByText("Podklady se od návrhu změnily")).toBeVisible()
    await expect(section.queryByRole("button", { name: "Použít návrh" })).not.toBeInTheDocument()
  },
}

/** The latest run failed; the last finished proposal is still current and can be applied. */
export const AfterFailedRerun: Story = {
  ...withProposal("failed"),
  play: async ({ canvas }) => {
    const section = await proposal(canvas)
    await expect(await section.findByText("Níže je poslední dokončený návrh.")).toBeVisible()
    await expect(section.getByRole("button", { name: "Použít návrh" })).toBeVisible()
  },
}

/** Nothing would change against the saved placements: no button. */
export const NothingToApply: Story = {
  ...withProposal("empty"),
  play: async ({ canvas }) => {
    const section = await proposal(canvas)
    await expect(await section.findByText("V termínu nejsou potvrzení účastníci")).toBeVisible()
    await expect(section.queryByRole("button", { name: "Použít návrh" })).not.toBeInTheDocument()
  },
}
