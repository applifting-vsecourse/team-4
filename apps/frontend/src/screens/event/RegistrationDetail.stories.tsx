import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, userEvent, within } from "storybook/test"

import { apiUrl, failOn, failsOnRefresh } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { openDialog, refresh, showsText } from "@/screens/steps"

import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { makeOwnChange } from "@/features/registrations/fixtures/registrationChanges"
import { makeRegistrationDetail } from "@/features/registrations/fixtures/registrations"

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
  play: () => showsText("Data se nepodařilo načíst. Zkuste to znovu."),
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
  play: () => showsText("Změny přihlášky se nepodařilo načíst."),
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
