import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, userEvent, within } from "storybook/test"

import { apiUrl, failOn, failsOnRefresh } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { openDialog, refresh, showsText } from "@/screens/steps"

import { organizerRoommateWishesSchema } from "@/features/registrations/api/roommateWishSchemas"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { makeOwnChange } from "@/features/registrations/fixtures/registrationChanges"
import { makeRegistrationDetail } from "@/features/registrations/fixtures/registrations"
import { ORGANIZER_WISHES, STORED_WISHES } from "@/features/registrations/fixtures/roommateWishes"

const REGISTRATION_ID = makeRegistrationDetail().id
const DETAIL = "/organizations/:organizationId/events/:eventId/registrations/:registrationId"
const NAME = "Anna Nováková"
const PENDING = makeOwnChange({ registrationId: REGISTRATION_ID })

const meta = {
  title: "Screens/Event/RegistrationDetail",
  ...screenMeta,
  args: { url: eventUrl(`/registrations/${REGISTRATION_ID}`) },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** One registration with its payments (S2-11, S2-12). */
export const RegistrationDetail: Story = { play: showsHeading(NAME) }

/** PO feedback point 11: align the overview, group payment history, and give long sections full width. */
export const PoFeedbackLayoutPreview: Story = { play: showsHeading(NAME) }

/** The participant's roommate wishes, read-only for the organizer (S4-05). */
export const RoommateWishes: Story = {
  play: async (context) => {
    await showsHeading(NAME)(context)
    await expect(await context.canvas.findByText("Přání na spolubydlící")).toBeVisible()
    await expect(context.canvas.getByText("Barbora Kučerová, Kristýna Dvořáková")).toBeVisible()
  },
}

const ORGANIZER_WISHES_URL =
  "/organizations/:organizationId/events/:eventId/registrations/:registrationId/roommate-wishes"

/** No wishes yet. */
export const RoommateWishesNone: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      http.get(apiUrl(ORGANIZER_WISHES_URL), () =>
        HttpResponse.json(organizerRoommateWishesSchema.parse({ wishes: [] })),
      ),
    )
  },
  play: async (context) => {
    await showsHeading(NAME)(context)
    await expect(await context.canvas.findByText("Bez přání")).toBeVisible()
  },
}

/** The wishes failed to load: the rest of the detail stays, with a retry. */
export const RoommateWishesFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", ORGANIZER_WISHES_URL))
  },
  play: async (context) => {
    await showsHeading(NAME)(context)
    await expect(
      await context.canvas.findByText("Přání na spolubydlící se nepodařilo načíst"),
    ).toBeVisible()
  },
}

/** "Aktualizovat" also reloads the wishes, not only the registration. */
export const RoommateWishesRefreshed: Story = {
  beforeEach: ({ msw }) => {
    let requests = 0
    msw.use(
      http.get(apiUrl(ORGANIZER_WISHES_URL), () => {
        requests += 1
        return HttpResponse.json(
          requests === 1
            ? ORGANIZER_WISHES
            : organizerRoommateWishesSchema.parse({
                wishes: [...ORGANIZER_WISHES.wishes, STORED_WISHES.candidates[0]],
              }),
        )
      }),
    )
  },
  play: async (context) => {
    await showsHeading(NAME)(context)
    await expect(
      await context.canvas.findByText("Barbora Kučerová, Kristýna Dvořáková"),
    ).toBeVisible()
    await refresh(context.canvas)
    await expect(
      await context.canvas.findByText("Barbora Kučerová, Kristýna Dvořáková, Adéla Horáková"),
    ).toBeVisible()
  },
}

export const Unavailable: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", DETAIL, 404))
  },
  play: () => showsText("Záznam není dostupný"),
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", DETAIL))
  },
  play: () => showsText("Data se nepodařilo načíst"),
}

export const RefreshFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failsOnRefresh("get", DETAIL, makeRegistrationDetail()))
  },
  play: async (context) => {
    await showsHeading(NAME)(context)
    await refresh(context.canvas)
    await showsText(/z posledního úspěšného načtení/)
  },
}

/** A request waits for the organizer: approve or reject (F35-2a). */
export const PendingChange: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.registrationChanges([PENDING]))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Schválit" })).toBeEnabled()
    await expect(canvas.getByRole("button", { name: "Zamítnout" })).toBeEnabled()
  },
}

/** The registration changed after the request: it can only be rejected. */
export const StaleChange: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.registrationChanges([{ ...PENDING, isStale: true }]))
  },
  play: async ({ canvas }) => {
    await showsText(/žádost proto nelze schválit/)
    await expect(canvas.getByRole("button", { name: "Schválit" })).toBeDisabled()
  },
}

export const DecisionFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.registrationChanges([PENDING]),
      ...failOn("post", `${DETAIL}/changes/:changeId/:decision`),
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Schválit" }))
    await showsText("Rozhodnutí se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

/** Another organizer decided meanwhile. */
export const DecidedElsewhere: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.registrationChanges([PENDING]),
      ...failOn("post", `${DETAIL}/changes/:changeId/:decision`, 409, {
        code: "change_already_decided",
      }),
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Schválit" }))
    await showsText("O žádosti už bylo rozhodnuto jinak. Načtěte stránku znovu.")
  },
}

/** Decided requests stay in the history of the registration. */
export const ChangeHistory: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.registrationChanges([
        { ...PENDING, status: "approved", decidedAt: "2027-03-12T08:30:00.000Z" },
      ]),
    )
  },
  play: () => showsText("Historie změn"),
}

export const ChangesLoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", `${DETAIL}/changes`))
  },
  play: () => showsText("Změny přihlášky se nepodařilo načíst"),
}

/** The answer needs the organizer's own decision about accommodation (F39-1). */
export const NeedsDetermination: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      http.get(apiUrl(DETAIL), () =>
        HttpResponse.json(
          makeRegistrationDetail({
            gender: "undisclosed",
            requiresManualAccommodation: true,
          }),
        ),
      ),
    )
  },
  play: () => showsText("Ubytování je potřeba určit ručně"),
}

export const RecordPaymentDialog: Story = {
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Zaznamenat platbu")
    await expect(within(dialog).getByLabelText("Přijatá částka (Kč)")).toBeVisible()
  },
}

export const RecordPaymentFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", `${DETAIL}/payments`))
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Zaznamenat platbu")
    await userEvent.type(within(dialog).getByLabelText("Přijatá částka (Kč)"), "1000")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit platbu" }))
    await showsText("Platbu se nepodařilo uložit. Zůstatek se nezměnil, zkuste to prosím znovu.")
  },
}

export const NeedsSaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${DETAIL}/needs`))
  },
  play: async ({ canvas }) => {
    const title = await canvas.findByText("Doprava, strava a zdraví", {}, { timeout: 5000 })
    const needs = within(title.closest<HTMLElement>('[data-slot="card"]')!)
    await userEvent.click(needs.getByRole("button", { name: "Upravit" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Uložit údaje" }))
    await showsText("Údaje se nepodařilo uložit. Zůstaly zachované, zkuste to prosím znovu.")
  },
}
