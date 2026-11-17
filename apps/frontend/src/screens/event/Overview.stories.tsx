import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, waitFor, within } from "storybook/test"

import { env } from "@/config/env"
import { failOn, neverAnswer } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { eventDetailSchema, eventTermSchema } from "@/features/events/api/eventSchemas"
import { DRAFT_EVENT, OPEN_EVENT } from "@/features/events/fixtures/events"
import { eventHandlers } from "@/features/events/fixtures/handlers"
import { ORGANIZATION } from "@/features/organizations/fixtures/organizations"
import { registrationChangeListSchema } from "@/features/registrations/api/registrationChangeSchemas"

const draftUrl = `/organizations/${ORGANIZATION.id}/events/${DRAFT_EVENT.id}`
const pendingChanges = registrationChangeListSchema.parse({
  changes: [
    {
      id: "0190c0de-0000-7000-8000-000000000701",
      registrationId: "0190c0de-0000-7000-8000-000000000001",
      status: "pending",
      kinds: ["move"],
      createdAt: "2027-03-02T09:15:00.000Z",
      decidedAt: null,
      summary: {
        values: [],
        needs: null,
        terms: [
          {
            termId: "0190c0de-0000-7000-8000-000000000101",
            label: "Turnus 1",
            startDate: "2027-07-04",
            endDate: "2027-07-17",
            priceMinor: 450_000,
            original: "confirmed",
            proposed: "cancelled",
          },
          {
            termId: "0190c0de-0000-7000-8000-000000000102",
            label: "Turnus 2",
            startDate: "2027-08-01",
            endDate: "2027-08-14",
            priceMinor: 450_000,
            original: null,
            proposed: "confirmed",
          },
        ],
        original: { dueMinor: 450_000, paidMinor: 200_000, balanceMinor: 250_000 },
        proposed: { dueMinor: 450_000, paidMinor: 200_000, balanceMinor: 250_000 },
      },
      isStale: false,
      participant: { firstName: "Anna", lastName: "Nováková", email: "anna@example.cz" },
    },
  ],
})

const meta = {
  title: "Screens/Event/Overview",
  ...screenMeta,
  args: { url: eventUrl() },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Management of one event with open registration (S2-04). */
export const Overview: StoryObj<typeof meta> = {
  play: async (context) => {
    await showsHeading("Letní tábor Modrá Hora 2027")(context)
    await expect(
      context.canvas.queryByRole("navigation", { name: "Části akce" }),
    ).not.toBeInTheDocument()
    await expect(
      await context.canvas.findByText("Žádné žádosti nečekají na vaše rozhodnutí."),
    ).toBeVisible()
  },
}

export const OverviewWithPendingApprovals: StoryObj<typeof meta> = {
  beforeEach: ({ msw }) => {
    msw.use(
      http.get(`${env.VITE_API_URL}${eventUrl()}/change-requests`, () =>
        HttpResponse.json(pendingChanges),
      ),
    )
  },
  play: async ({ canvas }) => {
    await showsHeading("Letní tábor Modrá Hora 2027")({ canvas })
    const attention = within(canvas.getByRole("region", { name: "Vyžaduje vaši pozornost" }))
    await expect(await attention.findByText("1 žádost čeká na rozhodnutí")).toBeVisible()
    await expect(await attention.findByText("Nejstarší: Anna Nováková")).toBeVisible()
    await expect(await attention.findByText(/Přesun termínu/)).toBeVisible()
    await expect(attention.getByRole("link", { name: "Vyřídit žádosti" })).toHaveAttribute(
      "href",
      `${eventUrl()}/registrations?view=approvals`,
    )
  },
}

export const OverviewWithTips: StoryObj<typeof meta> = {
  beforeEach: ({ msw }) => {
    const endpoint = `${env.VITE_API_URL}${eventUrl()}`
    const event = eventDetailSchema.parse({
      ...OPEN_EVENT,
      isPublished: false,
      photos: [],
      contact: null,
      conditions: "",
    })
    msw.use(
      http.get(endpoint, () => HttpResponse.json(event)),
      http.get(`${endpoint}/accommodation/evaluation-mode`, () =>
        HttpResponse.json({ mode: "manual" }),
      ),
      ...organizerBackend(),
    )
  },
  play: async ({ canvas }) => {
    await showsHeading(OPEN_EVENT.name)({ canvas })
    const tips = within(await canvas.findByRole("region", { name: "Tipy pro akci" }))
    await expect(
      await tips.findByRole("heading", { name: "Zviditelněte akci v katalogu" }),
    ).toBeVisible()
    await expect(
      await tips.findByRole("heading", { name: "Doplňte veřejnou prezentaci" }),
    ).toBeVisible()
    await expect(
      await tips.findByRole("heading", { name: "Zapněte automatické přepočítání návrhu" }),
    ).toBeVisible()
    await expect(tips.getByRole("link", { name: "Nastavit katalog" })).toHaveAttribute(
      "href",
      `${eventUrl()}/settings#publication-heading`,
    )
    await expect(tips.getByRole("link", { name: "Upravit prezentaci" })).toHaveAttribute(
      "href",
      `${eventUrl()}/settings#public-presentation-heading`,
    )
    await expect(tips.getByRole("link", { name: "Upravit automatizaci" })).toHaveAttribute(
      "href",
      `${eventUrl()}/settings#automation-heading`,
    )
  },
}

export const DraftWithMissingPaymentSettings: StoryObj<typeof meta> = {
  args: { url: draftUrl },
  play: async (context) => {
    await showsHeading(DRAFT_EVENT.name)(context)
    const readiness = within(
      context.canvas.getByRole("region", { name: "Před otevřením přihlašování" }),
    )
    await expect(readiness.getByText("Číslo účtu a počet dní do připomenutí platby")).toBeVisible()
    await expect(readiness.queryByText("Alespoň jeden termín")).not.toBeInTheDocument()
    await expect(readiness.getByRole("link", { name: "Doplnit" })).toHaveAttribute(
      "href",
      `/organizations/${ORGANIZATION.id}/events/${DRAFT_EVENT.id}/settings#payments-heading`,
    )
  },
}

export const AddFirstTermFromOverview: StoryObj<typeof meta> = {
  args: { url: draftUrl },
  beforeEach: ({ msw }) => {
    const endpoint = `${env.VITE_API_URL}${draftUrl}`
    let event = eventDetailSchema.parse({
      ...DRAFT_EVENT,
      terms: [],
      openingBlockers: ["terms", "paymentSettings"],
    })
    msw.use(
      http.get(endpoint, () => HttpResponse.json(event)),
      ...organizerBackend(),
      http.post(`${endpoint}/terms`, async ({ request }) => {
        const input = eventTermSchema
          .pick({
            label: true,
            startDate: true,
            endDate: true,
            priceMinor: true,
          })
          .parse(await request.json())
        event = eventDetailSchema.parse({
          ...event,
          terms: [{ ...DRAFT_EVENT.terms[0], ...input }],
          openingBlockers: ["paymentSettings"],
        })
        return HttpResponse.json(event)
      }),
    )
  },
  play: async ({ canvas, userEvent }) => {
    await showsHeading(DRAFT_EVENT.name)({ canvas })
    await expect(await canvas.findByText("Alespoň jeden termín")).toBeVisible()
    await expect(canvas.queryByText("Tato akce zatím nemá žádný termín.")).not.toBeInTheDocument()
    await userEvent.click(await canvas.findByRole("button", { name: "Přidat termín" }))
    const page = within(document.body)
    const dialog = within(await page.findByRole("dialog", { name: "Nový termín" }))
    await userEvent.type(dialog.getByLabelText("Označení"), "První termín")
    for (const field of ["Začátek", "Konec"]) {
      await userEvent.click(dialog.getByLabelText(field))
      const day = await waitFor(() => {
        const calendar = document.querySelector<HTMLElement>(
          '[data-slot="popover-content"][data-state="open"]',
        )
        if (!calendar) throw new Error("The date picker is closed")
        return within(calendar).getByRole("button", { name: /(?:^|, )15\./ })
      })
      await userEvent.click(day)
    }
    await userEvent.type(dialog.getByLabelText("Cena (Kč)"), "500")
    await userEvent.click(dialog.getByRole("button", { name: "Uložit termín" }))

    const terms = within(await canvas.findByRole("region", { name: "Termíny a ceny" }))
    await expect(terms.getByRole("row", { name: /První termín/ })).toHaveTextContent("500 Kč")
  },
}

const EVENT = "/organizations/:organizationId/events/:eventId"

export const SummaryLoading: StoryObj<typeof meta> = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", `${EVENT}/registrations`))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status", { name: "Načítání souhrnu" })).toBeVisible()
    await showsText("Žádné žádosti nečekají na vaše rozhodnutí.")
  },
}

export const PendingApprovalsLoading: StoryObj<typeof meta> = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", `${EVENT}/change-requests`))
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("status", { name: "Načítání čekajících žádostí" }),
    ).toBeVisible()
  },
}

export const SummaryLoadFailed: StoryObj<typeof meta> = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", `${EVENT}/registrations`))
  },
  play: async () => {
    await showsText("Souhrn se nepodařilo načíst")
    await showsText("Žádné žádosti nečekají na vaše rozhodnutí.")
  },
}

export const PendingApprovalsLoadFailed: StoryObj<typeof meta> = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", `${EVENT}/change-requests`))
  },
  play: () => showsText("Čekající žádosti se nepodařilo načíst"),
}

/** Open without a term: none can be added any more. */
export const OpenWithoutTerms: StoryObj<typeof meta> = {
  beforeEach: ({ msw }) => {
    msw.use(...eventHandlers.detail({ ...OPEN_EVENT, terms: [] }))
  },
  play: async () => {
    await showsText("Od otevření přihlašování jsou termíny zamčené, nový termín už nelze přidat.")
    // Wait for the pending requests too, so the page is checked once settled.
    await showsText("Žádné žádosti nečekají na vaše rozhodnutí.")
  },
}

export const EventUnavailable: StoryObj<typeof meta> = {
  args: { url: `/organizations/${ORGANIZATION.id}/events/0190c0de-0000-7000-8000-000000000999` },
  play: () => showsText("Záznam není dostupný"),
}
