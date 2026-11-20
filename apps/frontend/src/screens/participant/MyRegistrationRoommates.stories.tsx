import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { apiError, apiUrl, failOn, neverAnswer } from "@/screens/msw"
import { screenMeta } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { participantRegistrationDetailSchema } from "@/features/registrations/api/participantRegistrationSchemas"
import { roommateWishesSchema } from "@/features/registrations/api/roommateWishSchemas"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { OWN_REGISTRATION } from "@/features/registrations/fixtures/participantRegistrations"
import {
  NO_CANDIDATES,
  NO_WISHES,
  STORED_WISHES,
} from "@/features/registrations/fixtures/roommateWishes"

// Moje přihlášky → Detail přihlášky → Úprava přihlášky (S4-05): the roommate
// wishes of a confirmed participant, saved on their own without approval.

const WISHES = `/participant/registrations/:registrationId/roommate-wishes`

const meta = {
  title: "Screens/Participant/MyRegistrationRoommates",
  ...screenMeta,
  args: { url: `/my-registrations/${OWN_REGISTRATION.id}/edit` },
  beforeEach: ({ msw }) => {
    msw.use(
      ...participantHandlers.signedIn(),
      ...registrationHandlers.own(),
      ...registrationHandlers.ownChange(),
      ...registrationHandlers.roommateWishes(),
    )
  },
} satisfies Meta<typeof screenMeta.component>

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

/** Not confirmed in any term: no wishes on the page (S4-05). */
export const NotConfirmed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      http.get(apiUrl("/participant/registrations/:registrationId"), () =>
        HttpResponse.json(
          participantRegistrationDetailSchema.parse({
            ...OWN_REGISTRATION,
            terms: OWN_REGISTRATION.terms.map((term) => ({ ...term, status: "waitlisted" })),
            availableTerms: [],
          }),
        ),
      ),
    )
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "Úprava přihlášky" }, TIMEOUT),
    ).toBeVisible()
    await expect(canvas.queryByText("Spolubydlící", { exact: true })).not.toBeInTheDocument()
  },
}

/** The form with the stored choice, ready to change. */
export const Editing: Story = {
  play: async ({ canvas }) => {
    const form = await startEditing(canvas)
    await expect(form.getByRole("button", { name: "Přidat spolubydlícího" })).toBeVisible()
  },
}

// The flows below click through a whole change. They stay as tests but are
// hidden from the Storybook sidebar, which shows only the states.
const FLOW = ["!dev"]

/** Several people picked by searching, then saved at once. */
export const ChooseSeveral: Story = {
  tags: FLOW,
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
  tags: FLOW,
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
  tags: FLOW,
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

/** A failed save keeps the selection in the form. */
export const SaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", WISHES))
  },
  play: async ({ canvas }) => {
    const form = await startEditing(canvas)
    await pick(form, "Veronika Pokorná")
    await userEvent.click(form.getByRole("button", { name: "Uložit" }))
    await showsText("Spolubydlící se nepodařilo uložit. Výběr zůstává, zkuste to prosím znovu.")
    const selected = within(form.getByRole("list", { name: "Vybraní spolubydlící" }))
    await expect(selected.getByText("Veronika Pokorná")).toBeVisible()
  },
}

/**
 * Refused: someone picked stopped being confirmed meanwhile. The server's
 * reason shows, the candidates reload without that person, and the pick keeps
 * its name, marked as the one to remove.
 */
export const SaveRefused: Story = {
  beforeEach: ({ msw }) => {
    let isRefused = false
    msw.use(
      http.get(apiUrl(WISHES), () =>
        HttpResponse.json(
          roommateWishesSchema.parse({
            ...STORED_WISHES,
            candidates: isRefused
              ? STORED_WISHES.candidates.filter((person) => person.name !== "Veronika Pokorná")
              : STORED_WISHES.candidates,
          }),
        ),
      ),
      http.put(apiUrl(WISHES), () => {
        isRefused = true
        return apiError(400, {
          code: "roommate_invalid",
          message: "Vyberte potvrzené účastníky této akce.",
        })
      }),
    )
  },
  play: async ({ canvas }) => {
    const form = await startEditing(canvas)
    await pick(form, "Veronika Pokorná")
    await userEvent.click(form.getByRole("button", { name: "Uložit" }))
    await showsText(
      "Vyberte potvrzené účastníky této akce. Seznam účastníků je aktualizovaný, upravte výběr.",
    )
    const selected = within(form.getByRole("list", { name: "Vybraní spolubydlící" }))
    await expect(await selected.findByText("· už není potvrzený účastník")).toBeVisible()
    await expect(selected.getByText("Veronika Pokorná")).toBeVisible()
    await expect(form.getByRole("button", { name: "Odebrat Veronika Pokorná" })).toBeVisible()
  },
}

/** Twenty picked, the most the event stores: nobody more can be added. */
export const FullList: Story = {
  beforeEach: ({ msw }) => {
    const people = Array.from({ length: 21 }, (_, index) => ({
      registrationId: `0190c0de-0000-7000-8000-${String(950 + index).padStart(12, "0")}`,
      name: `Účastník ${String(index + 1).padStart(2, "0")}`,
    }))
    msw.use(
      ...registrationHandlers.roommateWishes(
        roommateWishesSchema.parse({ candidates: people, wishes: people.slice(0, 20) }),
      ),
    )
  },
  play: async ({ canvas }) => {
    const form = await startEditing(canvas)
    await expect(form.getByText("Vybrat lze nejvýš 20 spolubydlících.")).toBeVisible()
    await expect(form.getByRole("button", { name: "Přidat spolubydlícího" })).toBeDisabled()
  },
}

/** A failed save keeps the selection; the next try stores it. */
export const SaveFailedThenRetried: Story = {
  tags: FLOW,
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
