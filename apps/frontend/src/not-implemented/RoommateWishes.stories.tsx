import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { http } from "msw"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { PageHeader } from "@/components/PageHeader"
import { Toaster } from "@/components/ui/sonner"
import { apiError, apiUrl, failOn, neverAnswer } from "@/screens/msw"
import { showsText } from "@/screens/steps"

import { ParticipantLayout } from "@/features/participant-access/components/ParticipantLayout"
import { RoommateWishesCard } from "@/features/registrations/components/RoommateWishesCard"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { OWN_REGISTRATION } from "@/features/registrations/fixtures/participantRegistrations"
import { NO_CANDIDATES, NO_WISHES } from "@/features/registrations/fixtures/roommateWishes"

// The roommate wishes of a confirmed participant (#338) on Úprava přihlášky.
// The card is real and talks to the API through MSW; placing it on the route,
// and showing it only to confirmed participants, come with the integration of
// #319.

const WISHES = `/participant/registrations/:registrationId/roommate-wishes`

function RoommateWishes() {
  return (
    <ParticipantLayout>
      <div className="space-y-6">
        <PageHeader
          title="Úprava přihlášky"
          description={OWN_REGISTRATION.event.name}
        />
        <RoommateWishesCard registrationId={OWN_REGISTRATION.id} />
      </div>
      <Toaster />
    </ParticipantLayout>
  )
}

const meta = {
  title: "Not implemented/S4-05 Roommate wishes",
  component: RoommateWishes,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.roommateWishes())
  },
} satisfies Meta<typeof RoommateWishes>

export default meta

type Story = StoryObj<typeof meta>

type Canvas = StoryContext["canvas"]

const TIMEOUT = { timeout: 5000 }

const storedList = (canvas: Canvas) =>
  canvas.findByRole("list", { name: "Vybraní spolubydlící" }, TIMEOUT)

/** "Upravit" or "Vybrat spolubydlící", then the form. */
async function startEditing(canvas: Canvas, name = "Upravit"): Promise<Canvas> {
  await userEvent.click(await canvas.findByRole("button", { name }, TIMEOUT))
  return within(await canvas.findByRole("form", { name: "Výběr spolubydlících" }))
}

/** Opens the searchable list of candidates. */
async function openPicker(form: Canvas) {
  await userEvent.click(form.getByRole("button", { name: "Přidat spolubydlícího" }))
  return within(await screen.findByRole("dialog", { name: "Přidat spolubydlícího" }, TIMEOUT))
}

/** Closes the list with Escape, once it is gone. */
async function closePicker() {
  await userEvent.keyboard("{Escape}")
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), TIMEOUT)
}

/** Picks people in the list; it stays open between picks. */
async function pick(form: Canvas, ...names: string[]) {
  const picker = await openPicker(form)
  for (const name of names) {
    await userEvent.click(picker.getByRole("option", { name }))
  }
  await closePicker()
}

/** The stored choice, read-only. */
export const Stored: Story = {
  play: async ({ canvas }) => {
    const list = within(await storedList(canvas))
    await expect(list.getByText("Barbora Kučerová")).toBeVisible()
    await expect(list.getByText("Kristýna Dvořáková")).toBeVisible()
  },
}

export const NothingChosen: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.roommateWishes(NO_WISHES))
  },
  play: async ({ canvas }) => {
    await showsText("Zatím jste nikoho nevybrali.")
    await expect(canvas.getByRole("button", { name: "Vybrat spolubydlící" })).toBeVisible()
  },
}

/** Several people picked by searching, then saved at once. */
export const ChooseSeveral: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.roommateWishes(NO_WISHES))
  },
  play: async ({ canvas }) => {
    const form = await startEditing(canvas, "Vybrat spolubydlící")
    const picker = await openPicker(form)
    await userEvent.type(picker.getByPlaceholderText("Hledat účastníka…"), "Nov")
    await waitFor(() =>
      expect(picker.queryByRole("option", { name: "Adéla Horáková" })).not.toBeInTheDocument(),
    )
    await userEvent.click(picker.getByRole("option", { name: "Eliška Novotná" }))
    await closePicker()
    await pick(form, "Adéla Horáková")
    await userEvent.click(form.getByRole("button", { name: "Uložit" }))
    const stored = within(await storedList(canvas))
    await expect(stored.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Eliška Novotná",
      "Adéla Horáková",
    ])
    await showsText("Přání na spolubydlící je uložené")
  },
}

/** One person removed and another added to the stored choice. */
export const Change: Story = {
  play: async ({ canvas }) => {
    const form = await startEditing(canvas)
    await userEvent.click(form.getByRole("button", { name: "Odebrat Barbora Kučerová" }))
    await pick(form, "Tereza Marešová")
    await userEvent.click(form.getByRole("button", { name: "Uložit" }))
    const stored = within(await storedList(canvas))
    await expect(stored.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Kristýna Dvořáková",
      "Tereza Marešová",
    ])
  },
}

/** Every wish removed: back to nobody chosen. */
export const RemoveAll: Story = {
  play: async ({ canvas }) => {
    const form = await startEditing(canvas)
    await userEvent.click(form.getByRole("button", { name: "Odebrat Barbora Kučerová" }))
    await userEvent.click(form.getByRole("button", { name: "Odebrat Kristýna Dvořáková" }))
    await userEvent.click(form.getByRole("button", { name: "Uložit" }))
    await showsText("Zatím jste nikoho nevybrali.")
  },
}

/** Nobody else is confirmed yet: nothing to pick. */
export const NoCandidates: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.roommateWishes(NO_CANDIDATES))
  },
  play: async ({ canvas }) => {
    await showsText("Na akci zatím nejsou další potvrzení účastníci.")
    await expect(canvas.queryByRole("button", { name: /Vybrat|Upravit/ })).not.toBeInTheDocument()
  },
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", WISHES))
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("status", { name: "Načítání spolubydlících" }, TIMEOUT),
    ).toBeVisible()
  },
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", WISHES))
  },
  play: async ({ canvas }) => {
    await showsText("Spolubydlící se nepodařilo načíst")
    await expect(canvas.getByRole("button", { name: "Zkusit znovu" })).toBeVisible()
  },
}

export const Saving: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("put", WISHES))
  },
  play: async ({ canvas }) => {
    const form = await startEditing(canvas)
    await userEvent.click(form.getByRole("button", { name: "Uložit" }))
    await expect(await form.findByRole("button", { name: "Ukládám…" })).toBeDisabled()
  },
}

/** A failed save keeps the selection; the next try stores it. */
export const SaveFailedThenRetried: Story = {
  beforeEach: ({ msw }) => {
    // The first save fails; later ones reach the meta's handler.
    let hasFailed = false
    msw.use(
      http.put(apiUrl(WISHES), () => {
        if (hasFailed) return undefined
        hasFailed = true
        return apiError(500)
      }),
    )
  },
  play: async ({ canvas }) => {
    const form = await startEditing(canvas)
    await pick(form, "Veronika Pokorná")
    await userEvent.click(form.getByRole("button", { name: "Uložit" }))
    await showsText("Spolubydlící se nepodařilo uložit. Výběr zůstává, zkuste to prosím znovu.")
    const selected = within(form.getByRole("list", { name: "Vybraní spolubydlící" }))
    await expect(selected.getByText("Veronika Pokorná")).toBeVisible()

    await userEvent.click(form.getByRole("button", { name: "Uložit" }))
    await waitFor(async () => {
      const stored = within(await storedList(canvas))
      await expect(stored.getByText("Veronika Pokorná")).toBeVisible()
    }, TIMEOUT)
  },
}
