import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { apiError, apiUrl, failOn, neverAnswer } from "@/screens/msw"
import { screenMeta } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { participantPlacementHandlers } from "@/features/accommodation/fixtures/participantPlacements"
import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { programmeHandlers } from "@/features/programme/fixtures/handlers"
import { participantRegistrationDetailSchema } from "@/features/registrations/api/participantRegistrationSchemas"
import {
  roommateWishesInputSchema,
  roommateWishesSchema,
} from "@/features/registrations/api/roommateWishSchemas"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { OWN_REGISTRATION } from "@/features/registrations/fixtures/participantRegistrations"
import {
  NO_CANDIDATES,
  NO_WISHES,
  STORED_WISHES,
} from "@/features/registrations/fixtures/roommateWishes"

// Moje přihlášky → Detail přihlášky → Spravovat přihlášku → Ubytování (S4-05).
// Wishes are independently saved, including while another change is pending.

const WISHES = `/participant/registrations/:registrationId/roommate-wishes`
let wishRequests = 0

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
      ...programmeHandlers.participant(),
      ...participantPlacementHandlers(),
    )
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

type Canvas = StoryContext["canvas"]

const TIMEOUT = { timeout: 5000 }

const storedList = (canvas: Canvas) =>
  canvas.findByRole("list", { name: "Vybraní spolubydlící" }, TIMEOUT)

/** Opens the one dialog that contains the whole selection and save flow. */
async function startEditing(canvas: Canvas, name = "Upravit výběr"): Promise<Canvas> {
  await userEvent.click(await canvas.findByRole("button", { name }, TIMEOUT))
  return within(await screen.findByRole("dialog", { name: "Výběr spolubydlících" }, TIMEOUT))
}

/** Searches for and picks a person; the dialog stays open between searches. */
async function pick(dialog: Canvas, query: string, name: string) {
  const search = dialog.getByPlaceholderText("Hledat účastníka…")
  await userEvent.clear(search)
  await userEvent.type(search, query)
  await userEvent.click(dialog.getByRole("option", { name }))
}

/** The stored choice, read-only. */
export const Stored: Story = {
  play: async ({ canvas }) => {
    const list = within(await storedList(canvas))
    await expect(list.getByText("Barbora Kučerová")).toBeVisible()
    await expect(list.getByText("Kristýna Dvořáková")).toBeVisible()
  },
}

/**
 * A stored wish names someone who is no longer confirmed: marked in the stored
 * list and in the form, where it can be removed.
 */
export const StoredNotConfirmed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.roommateWishes(
        roommateWishesSchema.parse({
          ...STORED_WISHES,
          candidates: STORED_WISHES.candidates.filter(
            (person) => person.name !== "Kristýna Dvořáková",
          ),
        }),
      ),
    )
  },
  play: async ({ canvas }) => {
    const list = within(await storedList(canvas))
    await expect(list.getByText("· už není potvrzený účastník")).toBeVisible()
    await expect(list.getAllByRole("listitem")[1]).toHaveTextContent(
      "Kristýna Dvořáková · už není potvrzený účastník",
    )
    await expect(list.getAllByRole("listitem")[0]).toHaveTextContent(/^Barbora Kučerová$/)
    const form = await startEditing(canvas)
    const selected = within(form.getByRole("list", { name: "Vybraní spolubydlící" }))
    await expect(
      selected.getByRole("button", { name: "Odebrat Kristýna Dvořáková" }),
    ).toHaveTextContent("už není potvrzený účastník")
    await waitFor(
      () =>
        expect(form.getByRole("button", { name: "Odebrat Kristýna Dvořáková" })).toBeVisible(),
      TIMEOUT,
    )
  },
}

export const NothingChosen: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.roommateWishes(NO_WISHES))
  },
  play: async ({ canvas }) => {
    await showsText("Zatím jste nikoho nevybrali")
    await expect(canvas.getByRole("button", { name: "Vybrat spolubydlící" })).toBeVisible()
  },
}

/** Before confirmation, show no names and do not request the candidate list. */
export const NotConfirmed: Story = {
  beforeEach: ({ msw }) => {
    wishRequests = 0
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
      http.get(apiUrl(WISHES), () => {
        wishRequests += 1
        return HttpResponse.json(STORED_WISHES)
      }),
    )
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Ubytování", undefined, TIMEOUT)).toBeVisible()
    await expect(
      await canvas.findByText(
        "Spolubydlící si můžete vybrat po potvrzení účasti.",
        undefined,
        TIMEOUT,
      ),
    ).toBeVisible()
    await expect(canvas.queryByText("Barbora Kučerová")).not.toBeInTheDocument()
    await expect(canvas.queryByText("Kristýna Dvořáková")).not.toBeInTheDocument()
    await expect(
      canvas.queryByRole("button", { name: /Vybrat spolubydlící|Upravit výběr/ }),
    ).not.toBeInTheDocument()
    await expect(wishRequests).toBe(0)
  },
}

/** The management page with accommodation and its edit action. */
export const Editing: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Správa přihlášky")).toBeVisible()
    const dialog = await startEditing(canvas)
    await waitFor(
      () => expect(dialog.getByPlaceholderText("Hledat účastníka…")).toBeVisible(),
      TIMEOUT,
    )
    await expect(dialog.getByRole("option", { name: "Adéla Horáková" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Zrušit" })).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Uložit výběr" })).toBeVisible()
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
    const dialog = await startEditing(canvas, "Vybrat spolubydlící")
    const search = dialog.getByPlaceholderText("Hledat účastníka…")
    await userEvent.type(search, "Nov")
    await waitFor(() =>
      expect(dialog.queryByRole("option", { name: "Adéla Horáková" })).not.toBeInTheDocument(),
    )
    await userEvent.click(dialog.getByRole("option", { name: "Eliška Novotná" }))
    await expect(dialog.getByRole("list", { name: "Vybraní spolubydlící" })).toHaveTextContent(
      "Eliška Novotná",
    )
    await pick(dialog, "Horák", "Adéla Horáková")
    await expect(dialog.getByRole("list", { name: "Vybraní spolubydlící" })).toHaveTextContent(
      "Adéla Horáková",
    )
    await userEvent.click(dialog.getByRole("button", { name: "Uložit výběr" }))
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
    const dialog = await startEditing(canvas)
    const search = dialog.getByPlaceholderText("Hledat účastníka…")
    await userEvent.type(search, "Marešová")
    await userEvent.click(dialog.getByRole("button", { name: "Odebrat Barbora Kučerová" }))
    await expect(dialog.getByRole("option", { name: "Tereza Marešová" })).toBeVisible()
    await userEvent.click(dialog.getByRole("option", { name: "Tereza Marešová" }))
    await userEvent.click(dialog.getByRole("button", { name: "Uložit výběr" }))
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
    await userEvent.click(form.getByRole("button", { name: "Uložit výběr" }))
    await showsText("Zatím jste nikoho nevybrali")
  },
}

/** Nobody else is confirmed yet: nothing to pick. */
export const NoCandidates: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.roommateWishes(NO_CANDIDATES))
  },
  play: async ({ canvas }) => {
    await showsText("Zatím jste nikoho nevybrali")
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
    await userEvent.click(form.getByRole("button", { name: "Uložit výběr" }))
    await expect(await form.findByRole("button", { name: "Ukládám…" })).toBeDisabled()
  },
}

/** A failed save keeps the selection in the dialog for a successful retry. */
export const SaveFailed: Story = {
  tags: FLOW,
  beforeEach: ({ msw }) => {
    let attempts = 0
    msw.use(
      http.put(apiUrl(WISHES), async ({ request }) => {
        attempts += 1
        if (attempts === 1) return apiError(500)
        const { registrationIds } = roommateWishesInputSchema.parse(await request.json())
        const byId = new Map(STORED_WISHES.candidates.map((person) => [person.registrationId, person]))
        return HttpResponse.json(
          roommateWishesSchema.parse({
            ...STORED_WISHES,
            wishes: registrationIds.map((id) => byId.get(id)).filter((person) => person !== undefined),
          }),
        )
      }),
    )
  },
  play: async ({ canvas }) => {
    const form = await startEditing(canvas)
    await pick(form, "Pokorná", "Veronika Pokorná")
    await userEvent.click(form.getByRole("button", { name: "Uložit výběr" }))
    await showsText("Spolubydlící se nepodařilo uložit. Výběr zůstává, zkuste to prosím znovu.")
    const selected = within(form.getByRole("list", { name: "Vybraní spolubydlící" }))
    await expect(selected.getByText("Veronika Pokorná")).toBeVisible()
    await expect(screen.getByRole("dialog", { name: "Výběr spolubydlících" })).toBeVisible()
    await userEvent.click(form.getByRole("button", { name: "Uložit výběr" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), TIMEOUT)
    await expect(within(await storedList(canvas)).getByText("Veronika Pokorná")).toBeVisible()
  },
}

/** Cancel discards the draft and keeps the stored selection unchanged. */
export const CancelChanges: Story = {
  tags: FLOW,
  play: async ({ canvas }) => {
    const dialog = await startEditing(canvas)
    await userEvent.click(dialog.getByRole("button", { name: "Odebrat Barbora Kučerová" }))
    await pick(dialog, "Tereza", "Tereza Marešová")
    await userEvent.click(dialog.getByRole("button", { name: "Zrušit" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), TIMEOUT)
    const stored = within(await storedList(canvas))
    await expect(stored.getByText("Barbora Kučerová")).toBeVisible()
    await expect(stored.queryByText("Tereza Marešová")).not.toBeInTheDocument()
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
    await pick(form, "Pokorná", "Veronika Pokorná")
    await userEvent.click(form.getByRole("button", { name: "Uložit výběr" }))
    await showsText(
      "Vyberte potvrzené účastníky této akce. Seznam účastníků je aktualizovaný, upravte výběr.",
    )
    const selected = within(form.getByRole("list", { name: "Vybraní spolubydlící" }))
    await expect(
      selected.getByRole("button", { name: "Odebrat Veronika Pokorná" }),
    ).toHaveTextContent("už není potvrzený účastník")
    await expect(selected.getByText("Veronika Pokorná")).toBeVisible()
    await waitFor(
      () => expect(form.getByRole("button", { name: "Odebrat Veronika Pokorná" })).toBeVisible(),
      TIMEOUT,
    )
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
    await waitFor(
      () => expect(form.getByText("Vybrat lze nejvýš 20 spolubydlících.")).toBeVisible(),
      TIMEOUT,
    )
    await expect(form.getByRole("option", { name: "Účastník 21" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
  },
}
