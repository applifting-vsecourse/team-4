import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { failOn } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { openDialog, showsText } from "@/screens/steps"

import { DRAFT_EVENT, OPEN_EVENT } from "@/features/events/fixtures/events"
import { eventHandlers } from "@/features/events/fixtures/handlers"
import { ORGANIZATION } from "@/features/organizations/fixtures/organizations"

const meta = {
  title: "Screens/Event/Settings",
  ...screenMeta,
  args: { url: eventUrl("/settings") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

/** Terms, registration and payment settings of an event (S2-04, S2-06, S2-09). */
export const Settings: StoryObj<typeof meta> = {
  play: async (context) => {
    await showsHeading("Termíny a ceny")(context)
    const title = "Schvalování změn přihlášek"
    const approval = within(context.canvas.getByRole("region", { name: title }))
    await expect(approval.getByRole("heading", { name: title, level: 2 })).toBeVisible()
    const field = () => approval.queryByRole("textbox", { name: "Počet dní před začátkem termínu" })
    const trigger = approval.getByRole("button", { name: title })
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(field()).toBeVisible()
    await context.userEvent.click(within(trigger).getByText(title))
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(trigger).toHaveFocus()
    await waitFor(() =>
      expect(field()?.closest("[data-collapsible-section-content]")).toHaveAttribute("inert"),
    )
    await expect(field()).toBeInTheDocument()
    await context.userEvent.keyboard("{Enter}")
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(field()?.closest("[data-collapsible-section-content]")).not.toHaveAttribute(
      "inert",
    )
    await expect(field()).toBeVisible()
  },
}

export const Draft: StoryObj<typeof meta> = {
  args: { url: `/organizations/${ORGANIZATION.id}/events/${DRAFT_EVENT.id}/settings` },
  play: async ({ canvas, userEvent }) => {
    const automation = within(await canvas.findByRole("region", { name: "Automatizace" }))
    const presentation = within(canvas.getByRole("region", { name: "Veřejná prezentace" }))
    const presentationSave = presentation.getByRole("button", { name: /^Uložit$/ })
    const presentationContent = presentationSave.closest<HTMLElement>(
      "[data-collapsible-section-content]",
    )
    if (!presentationContent) throw new Error("Presentation content wrapper is missing")
    await waitFor(async () => {
      await expect(presentationContent.scrollHeight).toBeLessThanOrEqual(
        presentationContent.clientHeight + 1,
      )
      await expect(getComputedStyle(presentationContent).overflow).toBe("visible")
    })
    await expect(presentationSave).toBeVisible()
    const approval = canvas.getByRole("button", { name: "Uložit schvalování změn" })
    const rightEdge = approval.getBoundingClientRect().right

    for (const action of [
      canvas.getByRole("button", { name: "Otevřít přihlašování" }),
      canvas.getByRole("button", { name: "Uložit platební nastavení" }),
      presentationSave,
      automation.getByRole("button", { name: /^Uložit$/ }),
    ]) {
      await expect(action.getBoundingClientRect().right).toBeCloseTo(rightEdge)
    }

    const payment = within(canvas.getByRole("region", { name: "Platební údaje" }))
    const trigger = payment.getByRole("button", { name: "Platební údaje" })
    const account = payment.getByLabelText("Číslo účtu", { exact: true })
    const accountContent = account.closest<HTMLElement>("[data-collapsible-section-content]")
    if (!accountContent) throw new Error("Payment content wrapper is missing")
    await userEvent.type(account, "12345678")
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await waitFor(() => expect(accountContent).toHaveAttribute("inert"))
    await expect(getComputedStyle(accountContent).clipPath).toMatch(/-\d+px/)

    const registration = within(canvas.getByRole("region", { name: "Přihlašování" }))
    await userEvent.click(registration.getByRole("link", { name: "Doplnit" }))
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(accountContent).not.toHaveAttribute("inert")
    await waitFor(() => expect(account).toBeVisible())
    await waitFor(() => expect(getComputedStyle(accountContent).clipPath).toBe("none"))
    await expect(account).toHaveValue("12345678")
  },
}

type Story = StoryObj<typeof meta>
type Canvas = StoryContext["canvas"]

const EVENT = "/organizations/:organizationId/events/:eventId"
const draftUrl = `/organizations/${ORGANIZATION.id}/events/${DRAFT_EVENT.id}/settings`
/** A draft with everything filled in: registration can be opened. */
const READY_DRAFT = {
  ...DRAFT_EVENT,
  paymentSettings: OPEN_EVENT.paymentSettings,
  openingBlockers: [],
}

const region = async (canvas: Canvas, name: string) =>
  within(await canvas.findByRole("region", { name }, { timeout: 5000 }))

/** A free event: no payment settings needed (S2-09). */
export const FreeEvent: Story = {
  args: { url: draftUrl },
  beforeEach: ({ msw }) => {
    msw.use(
      ...eventHandlers.detail({
        ...DRAFT_EVENT,
        terms: DRAFT_EVENT.terms.map((term) => ({ ...term, priceMinor: 0 })),
        openingBlockers: [],
      }),
    )
  },
  play: () => showsText("Bezplatná akce nepotřebuje platební nastavení"),
}

export const PaymentSaveFailed: Story = {
  args: { url: draftUrl },
  beforeEach: ({ msw }) => {
    msw.use(...eventHandlers.detail(READY_DRAFT), ...failOn("put", `${EVENT}/payment-settings`))
  },
  play: async ({ canvas }) => {
    const payment = await region(canvas, "Platební údaje")
    // Saved settings are sent again only after a change.
    const reminder = payment.getByLabelText("Počet dní do připomenutí platby")
    await userEvent.clear(reminder)
    await userEvent.type(reminder, "10")
    await userEvent.click(payment.getByRole("button", { name: "Uložit platební nastavení" }))
    await showsText("Platební nastavení se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

export const OpenRegistrationFailed: Story = {
  args: { url: draftUrl },
  beforeEach: ({ msw }) => {
    msw.use(...eventHandlers.detail(READY_DRAFT), ...failOn("post", `${EVENT}/open-registration`))
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Otevřít přihlašování" }))
    await showsText("Přihlašování se nepodařilo otevřít. Zkuste to prosím znovu.")
  },
}

/** The server finds something missing at the last moment. */
export const OpenRegistrationRefused: Story = {
  args: { url: draftUrl },
  beforeEach: ({ msw }) => {
    msw.use(
      ...eventHandlers.detail(READY_DRAFT),
      ...failOn("post", `${EVENT}/open-registration`, 409, {
        code: "opening_conditions_not_met",
      }),
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Otevřít přihlašování" }))
    await showsText("Přihlašování nelze otevřít, doplňte chybějící údaje.")
  },
}

/** No approval period set (F35-1a). */
export const ChangeApprovalNotSet: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...eventHandlers.detail({ ...OPEN_EVENT, changeApprovalDays: null }))
  },
  play: () => showsText("Žádné změny přihlášek nepodléhají vašemu schválení"),
}

/** A failed save of the approval period opens a dialog, unlike the other sections. */
export const ChangeApprovalSaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${EVENT}/change-approval`))
  },
  play: async ({ canvas }) => {
    const approval = await region(canvas, "Schvalování změn přihlášek")
    await userEvent.click(approval.getByRole("button", { name: "Uložit schvalování změn" }))
    await showsText("Uložení se nezdařilo")
  },
}

export const PublicationSaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${EVENT}/publication`))
  },
  play: async ({ canvas }) => {
    const publication = await region(canvas, "Publikace")
    await userEvent.click(publication.getByRole("switch"))
    await showsText("Změnu publikace se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

/** The public description is required for the catalog (F55); editable until registration opens. */
export const PresentationInvalid: Story = {
  args: { url: draftUrl },
  play: async ({ canvas }) => {
    const presentation = await region(canvas, "Veřejná prezentace")
    await userEvent.clear(presentation.getByLabelText("Popis akce"))
    await userEvent.click(presentation.getByRole("button", { name: "Uložit" }))
    await showsText("Vyplňte popis.")
  },
}

export const PresentationSaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${EVENT}/presentation`))
  },
  play: async ({ canvas }) => {
    const presentation = await region(canvas, "Veřejná prezentace")
    await userEvent.click(presentation.getByRole("button", { name: "Uložit" }))
    await showsText("Veřejnou prezentaci se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

export const PhotoUploadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", `${EVENT}/photos`))
  },
  play: async ({ canvas }) => {
    const presentation = await region(canvas, "Veřejná prezentace")
    const photo = new File(["foto"], "tabor.jpg", { type: "image/jpeg" })
    await userEvent.upload(presentation.getByLabelText("Soubor s fotkou"), photo)
    await showsText("Fotku se nepodařilo nahrát. Zkuste to prosím znovu.")
  },
}

export const EvaluationModeSaveFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${EVENT}/accommodation/evaluation-mode`))
  },
  play: async ({ canvas }) => {
    const automation = await region(canvas, "Automatizace")
    await userEvent.click(automation.getByLabelText("Přepočítat návrh jen tlačítkem Přepočítat"))
    await userEvent.click(automation.getByRole("button", { name: "Uložit" }))
    await showsText("Režim se nepodařilo uložit")
  },
}

export const EvaluationModeLoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", `${EVENT}/accommodation/evaluation-mode`))
  },
  play: () => showsText("Automatizaci se nepodařilo načíst"),
}

/** A draft without any term yet. */
export const NoTerms: Story = {
  args: { url: draftUrl },
  beforeEach: ({ msw }) => {
    msw.use(...eventHandlers.detail({ ...DRAFT_EVENT, terms: [] }))
  },
  play: () => showsText("Zatím žádné termíny"),
}

/** Sent without the label and dates of the new term. */
export const TermInvalid: Story = {
  args: { url: draftUrl },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Přidat termín", "Nový termín")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit termín" }))
    await showsText("Vyplňte označení.")
    await showsText("Vyberte datum začátku.")
  },
}

export const TermSaveFailed: Story = {
  args: { url: draftUrl },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${EVENT}/terms/:termId`))
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Upravit termín Víkend", "Upravit termín")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit termín" }))
    await showsText("Termín se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

export const DeleteTermFailed: Story = {
  args: { url: draftUrl },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("delete", `${EVENT}/terms/:termId`))
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Odstranit termín Víkend")
    await userEvent.click(within(dialog).getByRole("button", { name: "Odstranit" }))
    await showsText("Termín se nepodařilo odstranit. Zkuste to prosím znovu.")
  },
}

/** Registration closed: name, place, terms and prices stay locked. */
export const Closed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...eventHandlers.detail({ ...OPEN_EVENT, status: "closed" }))
  },
  play: () =>
    showsText("Název, popis, místo, termíny a ceny zůstávají zamčené i po zavření přihlašování"),
}

/** Another organizer's or a removed event. */
export const EventUnavailable: Story = {
  args: {
    url: `/organizations/${ORGANIZATION.id}/events/0190c0de-0000-7000-8000-000000000999/settings`,
  },
  play: () => showsText("Záznam není dostupný"),
}
