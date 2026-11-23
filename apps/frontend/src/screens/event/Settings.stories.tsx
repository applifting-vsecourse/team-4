import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { apiUrl, failOn, neverAnswer } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { openDialog, showsText } from "@/screens/steps"

import { GENDER_ATTRIBUTE, SCHOOL_ATTRIBUTE } from "@/features/accommodation/fixtures/evaluation"
import { accommodationHandlers } from "@/features/accommodation/fixtures/handlers"
import { makeRoomProposalPreferences } from "@/features/accommodation/fixtures/roomProposal"
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
    await expect(context.canvas.getByRole("tab", { name: "Akce" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    for (const title of ["Základní údaje", "Termíny a ceny", "Veřejná prezentace"]) {
      await expect(context.canvas.getByRole("heading", { name: title, level: 2 })).toBeVisible()
    }
    await expect(
      context.canvas.queryByRole("region", { name: "Schvalování změn přihlášek" }),
    ).not.toBeInTheDocument()
  },
}

export const Draft: StoryObj<typeof meta> = {
  args: { url: `/organizations/${ORGANIZATION.id}/events/${DRAFT_EVENT.id}/settings?tab=event` },
  play: async ({ canvas, userEvent }) => {
    const presentation = within(await canvas.findByRole("region", { name: "Veřejná prezentace" }))
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
    await userEvent.click(canvas.getByRole("tab", { name: "Platby" }))
    const payment = within(canvas.getByRole("region", { name: "Platební údaje" }))
    const account = payment.getByLabelText("Číslo účtu", { exact: true })
    await userEvent.type(account, "12345678")
    await userEvent.click(canvas.getByRole("tab", { name: "Přihláška" }))
    await expect(account).not.toBeVisible()
    await userEvent.click(canvas.getByRole("tab", { name: "Platby" }))
    await expect(account).toHaveValue("12345678")

    await userEvent.click(canvas.getByRole("tab", { name: "Automatizace" }))
    const automation = within(await canvas.findByRole("region", { name: "Automatizace" }))
    await expect(automation.getByRole("button", { name: "Uložit automatizaci" })).toBeVisible()
  },
}

export const SettingsTabsKeyboard: Story = {
  play: async ({ canvas, userEvent }) => {
    const eventTab = await canvas.findByRole("tab", { name: "Akce" })
    eventTab.focus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(canvas.getByRole("tab", { name: "Přihláška" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await userEvent.keyboard("{ArrowRight}")
    await expect(canvas.getByRole("tab", { name: "Platby" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  },
}

export const SettingsTabRestoredFromUrl: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("tab", { name: "Ubytování" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await expect(await canvas.findByRole("region", { name: "Pravidla ubytování" })).toBeVisible()
  },
}

export const SettingsDirectSectionLink: Story = {
  args: { url: `${eventUrl("/settings")}#payments-heading` },
  play: async ({ canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole("tab", { name: "Platby" })).toHaveAttribute("aria-selected", "true"),
    )
    const heading = await canvas.findByRole("heading", { name: "Platební údaje" })
    await expect(heading).toBeVisible()
    await waitFor(() =>
      expect(heading.getBoundingClientRect().top).toBeLessThan(window.innerHeight),
    )
  },
}

export const SettingsLinkFromRegistrations: Story = {
  args: { url: `${eventUrl("/settings")}#accommodation-rules-heading` },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("tab", { name: "Ubytování" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await expect(await canvas.findByRole("heading", { name: "Pravidla ubytování" })).toBeVisible()
  },
}

export const SettingsLinkFromAccommodation: Story = {
  args: { url: `${eventUrl("/settings")}#terms-heading` },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("tab", { name: "Akce" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await expect(await canvas.findByRole("heading", { name: "Termíny a ceny" })).toBeVisible()
  },
}

export const SettingsLinkFromOverview: Story = {
  args: { url: `${eventUrl("/settings")}#automation-heading` },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("tab", { name: "Automatizace" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await expect(await canvas.findByRole("heading", { name: "Automatizace" })).toBeVisible()
  },
}

export const SettingsTabsDark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("tab", { name: "Akce" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await expect(canvas.getByRole("heading", { name: "Základní údaje" })).toBeVisible()
  },
}

export const SettingsTabsAt1024: Story = {
  globals: { viewport: { value: "organizer1024", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("tab", { name: "Akce" })).toBeVisible()
    await expect(canvas.getByRole("tab", { name: "Automatizace" })).toBeVisible()
    const list = canvas.getByRole("tablist", { name: "Kategorie nastavení" })
    await expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth + 1)
  },
}

export const SettingsTabsNarrow: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvas }) => {
    const list = await canvas.findByRole("tablist", { name: "Kategorie nastavení" })
    const viewport = list.parentElement
    if (!viewport) throw new Error("Tab overflow viewport is missing")
    await expect(getComputedStyle(viewport).overflowX).toBe("auto")
    await expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth)
    const tabTops = [...list.querySelectorAll<HTMLElement>('[role="tab"]')].map((tab) =>
      Math.round(tab.getBoundingClientRect().top),
    )
    await expect(new Set(tabTops).size).toBe(1)
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
  args: { url: `${draftUrl}?tab=payments` },
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
  args: { url: `${draftUrl}?tab=payments` },
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
  args: { url: `${draftUrl}?tab=event` },
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
  args: { url: `${draftUrl}?tab=event` },
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
  args: { url: `${eventUrl("/settings")}?tab=registration` },
  beforeEach: ({ msw }) => {
    msw.use(...eventHandlers.detail({ ...OPEN_EVENT, changeApprovalDays: null }))
  },
  play: () => showsText("Žádné změny přihlášek nepodléhají vašemu schválení"),
}

/** A failed save of the approval period stays at the form, like the other sections. */
export const ChangeApprovalSaveFailed: Story = {
  args: { url: `${eventUrl("/settings")}?tab=registration` },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${EVENT}/change-approval`))
  },
  play: async ({ canvas }) => {
    const approval = await region(canvas, "Schvalování změn přihlášek")
    const days = approval.getByLabelText("Počet dní před začátkem termínu")
    await userEvent.type(days, "14")
    await userEvent.click(approval.getByRole("button", { name: "Uložit schvalování změn" }))
    await showsText("Uložení se nezdařilo")
  },
}

export const PublicationSaveFailed: Story = {
  args: { url: `${eventUrl("/settings")}?tab=event` },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${EVENT}/publication`))
  },
  play: async ({ canvas }) => {
    const publication = await region(canvas, "Zveřejnění v katalogu")
    await userEvent.click(publication.getByRole("switch"))
    await showsText("Změnu publikace se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

/** The public description is required for the catalog (F55); it remains editable after registration opens. */
export const PresentationInvalid: Story = {
  args: { url: `${draftUrl}?tab=event` },
  play: async ({ canvas }) => {
    const presentation = await region(canvas, "Veřejná prezentace")
    await userEvent.clear(presentation.getByLabelText("Popis akce"))
    await userEvent.click(presentation.getByRole("button", { name: "Uložit" }))
    await showsText("Vyplňte popis.")
  },
}

export const PublishedPresentationPreview: Story = {
  args: { url: `${draftUrl}?tab=event` },
  beforeEach: ({ msw }) => {
    msw.use(...eventHandlers.detail({ ...DRAFT_EVENT, isPublished: true }))
  },
  play: async ({ canvas }) => {
    const presentation = await region(canvas, "Veřejná prezentace")
    const preview = presentation.getByRole("link", { name: "Náhled veřejné stránky" })
    await expect(preview).toHaveAttribute("href", `/e/${DRAFT_EVENT.publicId}`)
    await expect(preview).toHaveAttribute("target", "_blank")
  },
}

export const PresentationSaveFailed: Story = {
  args: { url: `${eventUrl("/settings")}?tab=event` },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${EVENT}/presentation`))
  },
  play: async ({ canvas }) => {
    const presentation = await region(canvas, "Veřejná prezentace")
    await userEvent.type(presentation.getByLabelText("Podmínky účasti"), "Plavky")
    await userEvent.click(presentation.getByRole("button", { name: "Uložit" }))
    await showsText("Veřejnou prezentaci se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

export const PhotoUploadFailed: Story = {
  args: { url: `${eventUrl("/settings")}?tab=event` },
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

/** A draft without any term yet. */
export const NoTerms: Story = {
  args: { url: `${draftUrl}?tab=event` },
  beforeEach: ({ msw }) => {
    msw.use(...eventHandlers.detail({ ...DRAFT_EVENT, terms: [] }))
  },
  play: () => showsText("Zatím žádné termíny"),
}

/** Sent without the label and dates of the new term. */
export const TermInvalid: Story = {
  args: { url: `${draftUrl}?tab=event` },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Přidat termín", "Nový termín")
    await userEvent.type(within(dialog).getByLabelText("Označení"), "  ")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit termín" }))
    await showsText("Vyplňte označení.")
    await showsText("Vyberte datum začátku.")
  },
}

export const TermSaveFailed: Story = {
  args: { url: `${draftUrl}?tab=event` },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${EVENT}/terms/:termId`))
  },
  play: async ({ canvas }) => {
    const dialog = await openDialog(canvas, "Upravit termín Víkend", "Upravit termín")
    await userEvent.type(within(dialog).getByLabelText("Označení"), " upraveno")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit termín" }))
    await showsText("Termín se nepodařilo uložit. Zkuste to prosím znovu.")
  },
}

export const DeleteTermFailed: Story = {
  args: { url: `${draftUrl}?tab=event` },
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

/** Pravidla ubytování (#384): compact selection, defaults, manual exceptions and save. */
export const HardAttribute: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  play: async ({ canvas }) => {
    const rules = await region(canvas, "Pravidla ubytování")
    const select = await rules.findByRole("combobox", { name: "Pokoje dělit podle" })
    const save = rules.getByRole("button", { name: "Uložit pravidlo" })
    await expect(select).toHaveTextContent("Pohlaví pro ubytování")
    select.focus()
    await expect(select).toHaveFocus()
    await expect(rules.getByText("Přednastavená otázka")).toBeVisible()
    await expect(rules.getByText("Různé odpovědi znamenají oddělené pokoje.")).toBeVisible()
    const exceptions = rules.getByRole("button", { name: /Komu určit pokoj ručně/ })
    await expect(exceptions).toHaveAttribute("aria-expanded", "false")
    await expect(exceptions).toHaveTextContent(
      "Komu určit pokoj ručněJiná odpověď · Nechci uvést · Chybějící odpověď",
    )
    exceptions.focus()
    await expect(exceptions).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(exceptions).toHaveAttribute("aria-expanded", "true")
    await expect(
      rules.getByText("Účastníkům bez vyplněné odpovědi určíte pokoj vždy ručně."),
    ).toBeVisible()
    await expect(rules.getByRole("checkbox", { name: "Jiná odpověď" })).toBeChecked()
    await expect(rules.getByRole("checkbox", { name: "Nechci uvést" })).toBeChecked()
    const female = rules.getByRole("checkbox", { name: "Žena" })
    await userEvent.click(female)
    await expect(exceptions).toHaveTextContent("Žena")
    await expect(exceptions).toHaveTextContent("Chybějící odpověď")
    await userEvent.click(save)
    await showsText("Pravidla ubytování byla uložena.")
    await expect(select).toHaveTextContent("Pohlaví pro ubytování")
    exceptions.focus()
    await userEvent.keyboard(" ")
    await expect(exceptions).toHaveAttribute("aria-expanded", "false")
  },
}

/** The hard attribute controls keep readable contrast in Night ticket mode. */
export const HardAttributeDark: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  globals: { theme: "dark" },
  play: HardAttribute.play,
}

/** No hard attribute: only the beds of the rooms count. */
export const NoHardAttribute: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  beforeEach: ({ msw }) => {
    msw.use(...accommodationHandlers.hardAttribute(null))
  },
  play: async ({ canvas }) => {
    const rules = await region(canvas, "Pravidla ubytování")
    await expect(
      await rules.findByRole("combobox", { name: "Pokoje dělit podle" }),
    ).toHaveTextContent("Bez rozdělení")
    await expect(
      rules.getByText("Pokoj mohou sdílet všichni. Návrh zohlední kapacity a preference."),
    ).toBeVisible()
    await expect(
      rules.queryByRole("button", { name: /Komu určit pokoj ručně/ }),
    ).not.toBeInTheDocument()
  },
}

export const NoHardAttributeDark: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  globals: { theme: "dark" },
  beforeEach: NoHardAttribute.beforeEach,
  play: NoHardAttribute.play,
}

/** A failed save keeps the chosen option and says which rule still applies. */
export const HardAttributeSaveFailed: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", `${EVENT}/accommodation/hard-attribute`))
  },
  play: async ({ canvas }) => {
    const rules = await region(canvas, "Pravidla ubytování")
    const select = await rules.findByRole("combobox", { name: "Pokoje dělit podle" })
    const exceptions = rules.getByRole("button", { name: /Komu určit pokoj ručně/ })
    await userEvent.click(exceptions)
    const female = rules.getByRole("checkbox", { name: "Žena" })
    await userEvent.click(female)
    const save = rules.getByRole("button", { name: "Uložit pravidlo" })
    await userEvent.click(save)
    await showsText("Pravidlo se nepodařilo uložit")
    await showsText("Pokoje se dál dělí podle: Pohlaví.")
    await expect(select).toHaveTextContent("Pohlaví pro ubytování")
    await expect(female).toBeChecked()
  },
}

export const HardAttributeLoadFailed: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", `${EVENT}/accommodation/hard-attribute`))
  },
  play: () => showsText("Pravidla ubytování se nepodařilo načíst"),
}

const PREFERENCES = `${EVENT}/accommodation/room-proposal-preferences`
const SOURCE_QUESTION = {
  ...SCHOOL_ATTRIBUTE,
  label: "Jakou školu nebo vzdělávací program účastník navštěvuje?",
}
const SOURCE_PREFERENCES = {
  preferences: [
    { id: "gender", neutralValues: ["other", "undisclosed"] },
    { id: SOURCE_QUESTION.attribute },
    { id: "roommate-wishes" },
  ],
  wishes: "roommate-wishes",
  attributes: [GENDER_ATTRIBUTE, SOURCE_QUESTION],
}

/** The ranked items of Návrh pokojů, in order. */
const rankedItems = (section: Awaited<ReturnType<typeof region>>) =>
  within(section.getByRole("list"))
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "")

/** All three preference sources appear together in the ranked room proposal (#389). */
export const RoomProposalPreferences: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  beforeEach: ({ msw }) => {
    msw.use(
      ...accommodationHandlers.attributeRules([SOURCE_QUESTION]),
      ...accommodationHandlers.roomProposalPreferences(SOURCE_PREFERENCES),
    )
  },
  play: async ({ canvas }) => {
    const section = await region(canvas, "Návrh pokojů")
    await expect(await section.findByText("Přání na spolubydlící")).toBeVisible()
    await expect(rankedItems(section)).toHaveLength(3)
    const list = section.getByRole("list")
    list.style.width = "12rem"
    const expectedSources = [
      [
        "Přednastavená otázka",
        "Vychází z odpovědí účastníků na přednastavenou otázku o pohlaví pro ubytování.",
      ],
      [
        "Vlastní otázka",
        "Vychází z odpovědí účastníků na otázku, kterou jste přidali do přihlášky.",
      ],
      ["Z přihlášek", "Spolubydlící si účastníci vybírají ve správě přihlášky."],
    ] as const
    for (const [label, tooltipText] of expectedSources) {
      const row = within(list)
        .getAllByRole("listitem")
        .find((item) => within(item).queryByText(label))!
      const badge = within(row).getByText(label)
      await expect(badge).toBeVisible()
      await expect(badge).toHaveAttribute("data-variant", "secondary")
      badge.focus()
      await waitFor(async () => {
        const tooltip = within(document.body).getByRole("tooltip")
        await expect(tooltip).toHaveTextContent(tooltipText)
        await expect(tooltip).toBeVisible()
      })
      await userEvent.keyboard("{Escape}")
      await waitFor(() =>
        expect(within(document.body).queryByRole("tooltip")).not.toBeInTheDocument(),
      )
    }
    const wishesBadge = within(list).getByText("Z přihlášek")
    await userEvent.pointer({ target: wishesBadge, keys: "[TouchA>]" })
    await userEvent.pointer({ target: wishesBadge, keys: "[/TouchA]" })
    await userEvent.click(wishesBadge)
    await waitFor(async () => {
      const tooltip = within(document.body).getByRole("tooltip")
      await expect(tooltip).toHaveTextContent(
        "Spolubydlící si účastníci vybírají ve správě přihlášky.",
      )
      await expect(tooltip).toBeVisible()
    })
    await userEvent.click(document.body)
    await waitFor(() =>
      expect(within(document.body).queryByRole("tooltip")).not.toBeInTheDocument(),
    )
    const customRow = within(list)
      .getAllByRole("listitem")
      .find((item) => within(item).queryByText(SOURCE_QUESTION.label))!
    const customTitle = customRow.querySelector("p")!
    const customBadge = within(customRow).getByText("Vlastní otázka")
    await expect(customTitle.getBoundingClientRect().height).toBeGreaterThan(24)
    await expect(customBadge.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      customTitle.getBoundingClientRect().bottom,
    )
    for (const label of ["Pohlaví", SOURCE_QUESTION.label, "Přání na spolubydlící"]) {
      await expect(section.getByRole("button", { name: `Odebrat ${label}` })).toBeVisible()
      await expect(section.getByRole("button", { name: `Přesunout ${label}` })).toBeVisible()
    }
    await expect(
      section.queryByRole("button", { name: "Přidat preferenci" }),
    ).not.toBeInTheDocument()
  },
}

export const RoomProposalPreferencesDark: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  ...RoomProposalPreferences,
  globals: { theme: "dark" },
  play: async ({ canvas }) => {
    const section = await region(canvas, "Návrh pokojů")
    const sourceBadge = await section.findByText("Z přihlášek")
    await expect(sourceBadge).toBeVisible()
    sourceBadge.focus()
    await waitFor(async () => {
      const tooltip = within(document.body).getByRole("tooltip")
      await expect(tooltip).toHaveTextContent(
        "Spolubydlící si účastníci vybírají ve správě přihlášky.",
      )
      await expect(tooltip).toBeVisible()
    })
  },
}

export const RoomProposalPreferencesNarrow: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  ...RoomProposalPreferences,
  globals: { viewport: { value: "mobile", isRotated: false } },
}

/** Gender ranked above "Přání" with its neutral answers; reordered and saved. */
export const RankedPreferences: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  beforeEach: ({ msw }) => {
    msw.use(
      ...accommodationHandlers.hardAttribute(null),
      ...accommodationHandlers.roomProposalPreferences(makeRoomProposalPreferences("ranked")),
    )
  },
  play: async ({ canvas }) => {
    const section = await region(canvas, "Návrh pokojů")
    await waitFor(() => expect(rankedItems(section)[0]).toMatch(/^1\.Pohlaví/))
    const ignoredAnswers = section.getByRole("button", { name: /Ignorované odpovědi/ })
    await expect(ignoredAnswers).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(ignoredAnswers)
    await expect(
      section.getByText("Vybrané odpovědi ani prázdné odpovědi neovlivní návrh."),
    ).toBeVisible()
    await expect(section.getByRole("checkbox", { name: "Jiná odpověď" })).toBeChecked()
    await expect(section.getByRole("checkbox", { name: "Nechci uvést" })).toBeChecked()
    await expect(section.getByRole("checkbox", { name: "Žena" })).not.toBeChecked()
    const handle = section.getByRole("button", { name: "Přesunout Přání na spolubydlící" })
    await userEvent.click(handle)
    await userEvent.keyboard(" {ArrowUp} ")
    await expect(handle).toHaveFocus()
    await expect(section.getByRole("status")).toHaveTextContent(
      "Přání na spolubydlící, pozice 1 z 2.",
    )
    await userEvent.click(section.getByRole("checkbox", { name: "Jiná odpověď" }))
    await userEvent.click(section.getByRole("button", { name: "Uložit preference" }))
    await showsText("Preference návrhu pokojů byly uloženy.")
    await expect(rankedItems(section)[0]).toMatch(/^1\.Přání/)
    await expect(section.getByRole("button", { name: /Ignorované odpovědi/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  },
}

/** Nothing ranked: gender is added with its default neutral answers. */
export const NoPreferences: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  beforeEach: ({ msw }) => {
    msw.use(
      ...accommodationHandlers.hardAttribute(null),
      ...accommodationHandlers.roomProposalPreferences(makeRoomProposalPreferences("empty")),
    )
  },
  play: async ({ canvas }) => {
    const section = await region(canvas, "Návrh pokojů")
    await expect(await section.findByText("Žádné preference nejsou přidané.")).toBeVisible()
    await userEvent.click(section.getByRole("button", { name: "Přidat preferenci" }))
    await userEvent.click(await within(document.body).findByRole("menuitem", { name: "Pohlaví" }))
    await waitFor(() => expect(rankedItems(section)[0]).toMatch(/^1\.Pohlaví/))
    await expect(section.getByRole("button", { name: /Ignorované odpovědi/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    await userEvent.click(section.getByRole("button", { name: "Přidat preferenci" }))
    await userEvent.click(
      await within(document.body).findByRole("menuitem", { name: "Přání na spolubydlící" }),
    )
    await expect(rankedItems(section)[1]).toMatch(/^2\.Přání na spolubydlící/)
    const handle = section.getByRole("button", { name: "Přesunout Přání na spolubydlící" })
    await userEvent.click(handle)
    await userEvent.keyboard(" {ArrowUp} ")
    await expect(rankedItems(section)[0]).toMatch(/^1\.Přání na spolubydlící/)
    await userEvent.click(section.getByRole("button", { name: /Ignorované odpovědi/ }))
    await expect(
      section.getByText("Vybrané odpovědi ani prázdné odpovědi neovlivní návrh."),
    ).toBeVisible()
    await expect(section.getByRole("checkbox", { name: "Nechci uvést" })).toBeChecked()
    await expect(section.getByRole("checkbox", { name: "Muž" })).not.toBeChecked()
    await userEvent.click(section.getByRole("checkbox", { name: "Jiná odpověď" }))
    await userEvent.click(section.getByRole("checkbox", { name: "Nechci uvést" }))
    await expect(section.getByRole("button", { name: /Ignorované odpovědi/ })).toHaveTextContent(
      "Žádné",
    )
  },
}

/** A failed save keeps the unsent list and says which one still applies. */
export const PreferencesSaveFailed: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("put", PREFERENCES))
  },
  play: async ({ canvas }) => {
    const section = await region(canvas, "Návrh pokojů")
    await userEvent.click(
      await section.findByRole("button", { name: "Odebrat Přání na spolubydlící" }),
    )
    const save = section.getByRole("button", { name: "Uložit preference" })
    await userEvent.click(save)
    await showsText("Preference se nepodařilo uložit")
    await showsText("Platí dál: 1. Přání na spolubydlící.")
    await expect(section.getByText("Žádné preference nejsou přidané.")).toBeVisible()
    await expect(save).toBeEnabled()
    await userEvent.click(save)
    await showsText("Preference se nepodařilo uložit")
  },
}

export const PreferencesLoading: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", PREFERENCES))
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("status", { name: "Načítání preferencí návrhu pokojů" }),
    ).toBeVisible()
  },
}

export const PreferencesLoadFailed: Story = {
  args: { url: `${eventUrl("/settings")}?tab=accommodation` },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PREFERENCES))
  },
  play: () => showsText("Preference návrhu pokojů se nepodařilo načíst"),
}

/**
 * Automatizace (#385): the evaluation and the room proposal each have their
 * own mode; a new event proposes rooms only on request. Saving one leaves
 * the other as it is.
 */
export const AutomationMixedModes: Story = {
  args: { url: `${eventUrl("/settings")}?tab=automation` },
  play: async ({ canvas }) => {
    const automation = await region(canvas, "Automatizace")
    const evaluation = await automation.findByRole("switch", {
      name: "Automaticky vyhodnocovat účast",
    })
    const rooms = automation.getByRole("switch", { name: "Automaticky navrhovat pokoje" })
    await expect(evaluation).toBeChecked()
    await expect(rooms).not.toBeChecked()
    await expect(
      automation.getByText("Potvrzení účasti a použití návrhu pokojů provádíte vy."),
    ).toBeVisible()
    evaluation.focus()
    await userEvent.keyboard(" ")
    await expect(evaluation).not.toBeChecked()
    await expect(rooms).not.toBeChecked()
  },
}

export const AutomationSharedSave: Story = {
  args: { url: `${eventUrl("/settings")}?tab=automation` },
  play: async ({ canvas }) => {
    const automation = await region(canvas, "Automatizace")
    const evaluation = await automation.findByRole("switch", {
      name: "Automaticky vyhodnocovat účast",
    })
    const rooms = automation.getByRole("switch", { name: "Automaticky navrhovat pokoje" })
    const save = automation.getByRole("button", { name: "Uložit automatizaci" })
    await userEvent.click(evaluation)
    await userEvent.click(rooms)
    await expect(save).toBeEnabled()
    await userEvent.click(save)
    await showsText("Automatizace byla uložena.")
    await expect(evaluation).not.toBeChecked()
    await expect(rooms).toBeChecked()
    await expect(save).toBeDisabled()
  },
}

export const AutomationPartialSaveFailed: Story = {
  args: { url: `${eventUrl("/settings")}?tab=automation` },
  beforeEach: ({ msw }) => {
    let roomSaves = 0
    msw.use(
      http.put(apiUrl(`${EVENT}/accommodation/room-proposal-mode`), async ({ request }) => {
        roomSaves += 1
        if (roomSaves === 1) return HttpResponse.json({ statusCode: 500 }, { status: 500 })
        return HttpResponse.json(await request.json())
      }),
    )
  },
  play: async ({ canvas }) => {
    const automation = await region(canvas, "Automatizace")
    const evaluation = await automation.findByRole("switch", {
      name: "Automaticky vyhodnocovat účast",
    })
    const rooms = automation.getByRole("switch", { name: "Automaticky navrhovat pokoje" })
    const save = automation.getByRole("button", { name: "Uložit automatizaci" })
    await userEvent.click(evaluation)
    await userEvent.click(rooms)
    await userEvent.click(save)
    await showsText("Automatické navrhování pokojů se nepodařilo uložit")
    await expect(evaluation).not.toBeChecked()
    await expect(rooms).toBeChecked()
    await expect(save).toBeEnabled()
    await userEvent.click(save)
    await showsText("Automatizace byla uložena.")
    await expect(save).toBeDisabled()
  },
}

export const AutomationMobile: Story = {
  args: { url: `${eventUrl("/settings")}?tab=automation` },
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvas }) => {
    const automation = await region(canvas, "Automatizace")
    const toggle = await automation.findByRole("switch", {
      name: "Automaticky vyhodnocovat účast",
    })
    const card = toggle.closest<HTMLElement>('[data-slot="card"]')
    if (!card) throw new Error("Automation card is missing")
    await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1)
    await expect(
      automation.getByRole("switch", { name: "Automaticky navrhovat pokoje" }),
    ).toBeVisible()
    await expect(automation.getByRole("button", { name: "Uložit automatizaci" })).toBeVisible()
  },
}

export const AutomationLoadFailed: Story = {
  args: { url: `${eventUrl("/settings")}?tab=automation` },
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", `${EVENT}/accommodation/room-proposal-mode`))
  },
  play: () => showsText("Automatizaci se nepodařilo načíst"),
}
