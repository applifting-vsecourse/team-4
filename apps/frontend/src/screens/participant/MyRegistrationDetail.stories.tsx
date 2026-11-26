import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { failOn, failsOnRefresh, neverAnswer } from "@/screens/msw"
import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { openDialog, refresh, showsText } from "@/screens/steps"

import { participantPlacementHandlers } from "@/features/accommodation/fixtures/participantPlacements"
import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { programmeHandlers } from "@/features/programme/fixtures/handlers"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import {
  AVAILABLE_TERMS,
  OWN_REGISTRATION,
  SETTLED_REGISTRATION,
} from "@/features/registrations/fixtures/participantRegistrations"
import { NO_QUESTIONS } from "@/features/registrations/fixtures/questions"
import {
  CANCEL_ALL_SUMMARY,
  makeChangePreview,
  makeOwnChange,
} from "@/features/registrations/fixtures/registrationChanges"
import { NO_WISHES } from "@/features/registrations/fixtures/roommateWishes"

const DETAIL = "/participant/registrations/:registrationId"
const CHANGES = `${DETAIL}/changes`
const PROGRAMME = `${DETAIL}/terms/:termId/programme`
const EVENT = OWN_REGISTRATION.event.name
const MOBILE = { viewport: { value: "mobile", isRotated: false } }

const meta = {
  title: "Screens/Participant/MyRegistrationDetail",
  ...screenMeta,
  args: { url: `/my-registrations/${OWN_REGISTRATION.id}` },
  beforeEach: ({ msw }) => {
    msw.use(
      ...participantHandlers.signedIn(),
      ...registrationHandlers.own(),
      ...registrationHandlers.roommateWishes(),
      ...programmeHandlers.participant(),
      // The detail shows the rooms of its confirmed terms (S4-02).
      ...participantPlacementHandlers(),
    )
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

const checkParticipantProgramme: NonNullable<Story["play"]> = async ({ canvas }) => {
  await showsHeading(EVENT)({ canvas })
  const term = await canvas.findByRole("button", { name: /Program – Turnus 1/ })
  const unconfirmedTerm = canvas.getByRole("button", { name: /Program – Turnus 2/ })
  await expect(term).toHaveAttribute("aria-expanded", "false")
  await expect(unconfirmedTerm).toHaveAttribute("aria-expanded", "false")
  await expect(canvas.queryByText("Příjezd a ubytování")).not.toBeInTheDocument()
  term.focus()
  await userEvent.keyboard("{Enter}")
  await expect(term).toHaveAttribute("aria-expanded", "true")

  const day = await canvas.findByRole("button", { name: /Neděle 4\. 7\. 2027/ })
  const nextDay = await canvas.findByRole("button", { name: /Pondělí 5\. 7\. 2027/ })
  await expect(day).toHaveAttribute("aria-expanded", "true")
  await expect(canvas.getByText("Příjezd a ubytování")).toBeVisible()
  await expect(canvas.getByText("Společná večeře")).toBeVisible()
  await expect(nextDay).toHaveAttribute("aria-expanded", "false")
  await expect(canvas.queryByText("Výlet na rozhlednu")).not.toBeInTheDocument()
  await expect(canvas.queryByRole("button", { name: "Přidat položku" })).not.toBeInTheDocument()

  nextDay.focus()
  await userEvent.keyboard("{Enter}")
  await expect(nextDay).toHaveAttribute("aria-expanded", "true")
  await expect(canvas.getByText("Výlet na rozhlednu")).toBeVisible()
  await expect(day).toHaveAttribute("aria-expanded", "true")

  await userEvent.click(unconfirmedTerm)
  await showsText("Program je dostupný až po potvrzení účasti v tomto termínu.")
}

/** One own registration with payment instructions, payments and the programme of the confirmed term (S2-14, F65). */
export const MyRegistrationDetail: Story = {
  play: checkParticipantProgramme,
}

/** Participant calendar on mobile with the light palette. */
export const ProgrammeMobile: Story = {
  globals: { ...MOBILE, theme: "light" },
  play: checkParticipantProgramme,
}

/** Participant calendar on desktop with the dark palette. */
export const ProgrammeDark: Story = {
  globals: { theme: "dark" },
  play: checkParticipantProgramme,
}

/** Participant calendar on mobile with the dark palette. */
export const ProgrammeMobileDark: Story = {
  globals: { ...MOBILE, theme: "dark" },
  play: checkParticipantProgramme,
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", DETAIL))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status", { name: "Načítání přihlášky" })).toBeVisible()
  },
}

/** Paid in full, nothing more to pay and no QR. */
export const Settled: Story = {
  args: { url: `/my-registrations/${SETTLED_REGISTRATION.id}` },
  play: async (context) => {
    await showsHeading(SETTLED_REGISTRATION.event.name)(context)
    await expect(
      context.canvas.queryByRole("img", { name: "QR kód s odkazem na platbu" }),
    ).not.toBeInTheDocument()
  },
}

/** A payment made through the QR link is marked in the history. */
export const PaidByQr: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration({
        ...OWN_REGISTRATION,
        payments: [
          ...OWN_REGISTRATION.payments,
          {
            id: "0190c0de-0000-7000-8000-000000000503",
            receivedOn: "2027-03-20",
            amountMinor: 100_000,
            source: "qr_link",
          },
        ],
      }),
    )
  },
  play: () => showsText("QR platba"),
}

/** A pending request is shown; management stays available for confirmed roommate wishes. */
export const RequestPending: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownChanges([makeOwnChange()]),
      ...registrationHandlers.ownRegistration({ ...OWN_REGISTRATION, canChange: false }),
    )
  },
  play: async ({ canvas }) => {
    await showsText("Čeká na schválení")
    await expect(canvas.getByRole("link", { name: "Spravovat přihlášku" })).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Zrušit účast" })).not.toBeInTheDocument()
    await expect(
      within(await canvas.findByRole("list", { name: "Vybraní spolubydlící" })).getByText(
        "Barbora Kučerová",
      ),
    ).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Upravit výběr" })).not.toBeInTheDocument()
  },
}

/** Manage wishes, save two separate searches, and see them read-only on return. */
export const ManageRoommates: Story = {
  tags: ["!dev"],
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.roommateWishes(NO_WISHES))
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("link", { name: "Spravovat přihlášku" }))
    await showsText("Správa přihlášky")
    await userEvent.click(await canvas.findByRole("button", { name: "Vybrat spolubydlící" }))
    const dialog = within(await screen.findByRole("dialog", { name: "Výběr spolubydlících" }))
    const search = dialog.getByPlaceholderText("Hledat účastníka…")
    await userEvent.type(search, "Nov")
    await userEvent.click(dialog.getByRole("option", { name: "Eliška Novotná" }))
    await userEvent.clear(search)
    await userEvent.type(search, "Horák")
    await userEvent.click(dialog.getByRole("option", { name: "Adéla Horáková" }))
    await userEvent.click(dialog.getByRole("button", { name: "Uložit výběr" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await userEvent.click(await canvas.findByRole("link", { name: "Detail přihlášky" }))
    const wishes = within(await canvas.findByRole("list", { name: "Vybraní spolubydlící" }))
    await expect(wishes.getByText("Eliška Novotná")).toBeVisible()
    await expect(wishes.getByText("Adéla Horáková")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Upravit výběr" })).not.toBeInTheDocument()
  },
}

export const RequestApproved: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownChanges([
        makeOwnChange({ status: "approved", decidedAt: "2027-03-12T08:30:00.000Z" }),
      ]),
    )
  },
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: "Žádosti o změnu (1)" }))
    await showsText("Schváleno")
    await showsText("Historie změn")
  },
}

export const RequestRejected: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownChanges([
        makeOwnChange({ status: "rejected", decidedAt: "2027-03-12T08:30:00.000Z" }),
      ]),
    )
  },
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: "Žádosti o změnu (1)" }))
    await showsText("Zamítnuto")
  },
}

/** The participant left one term: it stays listed as cancelled, without a programme. */
export const TermCancelled: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration({
        ...OWN_REGISTRATION,
        terms: OWN_REGISTRATION.terms.map((term, index) =>
          index === 1 ? { ...term, status: "cancelled" } : term,
        ),
      }),
    )
  },
  play: async (context) => {
    await showsHeading(EVENT)(context)
    await expect(
      context.canvas.queryByText("Program je dostupný až po potvrzení účasti v tomto termínu."),
    ).not.toBeInTheDocument()
  },
}

const OWNED_WITHOUT_PAYMENT = {
  ...OWN_REGISTRATION,
  paidMinor: 0,
  payments: [],
  paymentInstructions: null,
  paymentLinkToken: null,
}

/** Nothing confirmed yet: a preliminary price and "do not pay yet", no debt (S5-02). */
export const AwaitingConfirmation: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration({
        ...OWNED_WITHOUT_PAYMENT,
        terms: OWN_REGISTRATION.terms.map((term) => ({ ...term, status: "pending" })),
        amountDueMinor: 0,
        balanceMinor: 0,
      }),
    )
  },
  play: async ({ canvas }) => {
    await showsText("Předběžná cena vybraných termínů 9 000 Kč")
    await showsText(/Zatím nic neplaťte/)
    await expect(canvas.queryByText("Zbývá zaplatit")).not.toBeInTheDocument()
    await expect(canvas.queryByRole("link", { name: "Platební údaje" })).not.toBeInTheDocument()
  },
}

/** Only waitlisted terms: still preliminary, nothing to pay. */
export const WaitlistedOnly: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration({
        ...OWNED_WITHOUT_PAYMENT,
        terms: OWN_REGISTRATION.terms.map((term) => ({ ...term, status: "waitlisted" })),
        amountDueMinor: 0,
        balanceMinor: 0,
      }),
    )
  },
  play: async ({ canvas }) => {
    await showsText(/Zatím nic neplaťte/)
    await expect(canvas.queryByText("Zbývá zaplatit")).not.toBeInTheDocument()
  },
}

/** Confirmed 4 500 Kč, waitlisted 4 500 Kč and 2 000 Kč paid: 2 500 Kč remain; the waitlisted term is not counted. */
export const MixedPartlyPaid: Story = {
  play: async ({ canvas, canvasElement }) => {
    const status = await canvas.findByRole("region", { name: "Stav platby" })
    await expect(within(status).getByText("Zbývá zaplatit")).toBeVisible()
    await expect(within(status).getByText("2 500 Kč")).toBeVisible()
    await expect(canvas.queryByText("Cena celkem")).not.toBeInTheDocument()
    // The jump leads to the Platba section of the same page.
    await expect(within(status).getByRole("link", { name: "Platební údaje" })).toHaveAttribute(
      "href",
      expect.stringMatching(/#platba$/),
    )
    await expect(canvasElement.querySelector("#platba")).not.toBeNull()
  },
}

/** Confirmed and fully paid: "Zaplaceno", no further payment offered. */
export const MixedPaidInFull: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration({
        ...OWN_REGISTRATION,
        paidMinor: 450_000,
        balanceMinor: 0,
        paymentInstructions: null,
        paymentLinkToken: null,
        payments: [
          {
            id: "0190c0de-0000-7000-8000-000000000510",
            receivedOn: "2027-03-05",
            amountMinor: 450_000,
            source: "organizer",
          },
        ],
      }),
    )
  },
  play: async ({ canvas }) => {
    await showsText("Zaplaceno")
    await expect(canvas.queryByRole("link", { name: "Platební údaje" })).not.toBeInTheDocument()
    await expect(
      canvas.queryByRole("img", { name: "QR kód s odkazem na platbu" }),
    ).not.toBeInTheDocument()
  },
}

/** More paid than confirmed: the overpayment is named and no payment is requested. */
export const Overpaid: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration({
        ...OWN_REGISTRATION,
        paidMinor: 500_000,
        balanceMinor: -50_000,
        paymentInstructions: null,
        paymentLinkToken: null,
        payments: [
          {
            id: "0190c0de-0000-7000-8000-000000000511",
            receivedOn: "2027-03-05",
            amountMinor: 500_000,
            source: "organizer",
          },
        ],
      }),
    )
  },
  play: async ({ canvas }) => {
    await showsText(/O naložení s přeplatkem se domluvte s organizátorem/)
    await expect(canvas.getByText("500 Kč", { selector: "strong" })).toBeVisible()
    await expect(canvas.queryByText("Zbývá zaplatit")).not.toBeInTheDocument()
  },
}

/** A confirmed free participation is told apart from a paid one that still waits. */
export const FreeConfirmed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration({
        ...OWNED_WITHOUT_PAYMENT,
        terms: OWN_REGISTRATION.terms.slice(0, 1).map((term) => ({ ...term, priceMinor: 0 })),
        selectedPriceMinor: 0,
        amountDueMinor: 0,
        balanceMinor: 0,
      }),
    )
  },
  play: async ({ canvas }) => {
    await showsText("Potvrzená účast je zdarma, nic neplatíte.")
    await expect(canvas.queryByText(/Předběžná cena/)).not.toBeInTheDocument()
  },
}

/** The whole registration was cancelled: marked, no further changes. */
export const RegistrationCancelled: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration({
        ...OWN_REGISTRATION,
        terms: OWN_REGISTRATION.terms.map((term) => ({ ...term, status: "cancelled" })),
        // Nothing is owed any more; what was paid stays as an overpayment (S5-02).
        selectedPriceMinor: 0,
        amountDueMinor: 0,
        balanceMinor: -200_000,
        paymentInstructions: null,
        paymentLinkToken: null,
        isCancelled: true,
        canChange: false,
      }),
    )
  },
  play: async (context) => {
    await showsText("Odhlášená přihláška")
    await showsText("Účast zrušena")
    await showsText(/O naložení s přeplatkem se domluvte s organizátorem/)
    await expect(context.canvas.getByText("2 000 Kč", { selector: "strong" })).toBeVisible()
    await expect(context.canvas.queryByText(/Předběžná cena/)).not.toBeInTheDocument()
    await expect(
      context.canvas.queryByRole("button", { name: "Zrušit účast" }),
    ).not.toBeInTheDocument()
  },
}

/** "Zrušit účast" shows what leaving means before anything is sent. */
export const CancelRegistrationDialog: Story = {
  globals: { ...MOBILE, theme: "light" },
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownChange(
        makeChangePreview({ kinds: ["cancel_all"], summary: CANCEL_ALL_SUMMARY }),
      ),
    )
  },
  play: async ({ canvas }) => {
    const manageButton = await canvas.findByRole("link", { name: "Spravovat přihlášku" })
    const cancelButton = canvas.getByRole("button", { name: "Zrušit účast" })
    const manageBounds = manageButton.getBoundingClientRect()
    const cancelBounds = cancelButton.getBoundingClientRect()
    await expect(manageButton).toBeVisible()
    await expect(cancelButton).toBeVisible()
    await expect(Math.abs(manageBounds.top - cancelBounds.top)).toBeLessThan(1)
    await expect(manageButton.scrollWidth).toBeLessThanOrEqual(manageButton.clientWidth + 1)
    await expect(cancelButton.scrollWidth).toBeLessThanOrEqual(cancelButton.clientWidth + 1)

    const dialog = await openDialog(canvas, "Zrušit účast", "Odhlášení")
    await expect(
      await within(dialog).findByRole("button", { name: "Potvrdit odhlášení" }),
    ).toBeVisible()
  },
}

export const CancelPreviewFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", `${CHANGES}/preview`))
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Zrušit účast" }))
    await showsText("Kontrolu změn se nepodařilo načíst. Zkuste to prosím znovu.")
  },
}

export const ChangesLoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", CHANGES))
  },
  play: () => showsText(/Změny přihlášky se nepodařilo načíst/),
}

export const ProgrammeLoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", PROGRAMME))
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Program – Turnus 1/ }))
    await showsText("Program se nepodařilo načíst")
  },
}

export const ProgrammeNotReady: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...programmeHandlers.participantEmpty())
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Program – Turnus 1/ }))
    await showsText("Program zatím není připravený.")
  },
}

/** Another participant's or a removed registration: nothing private, a way back. */
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
    msw.use(
      ...failsOnRefresh("get", DETAIL, {
        ...OWN_REGISTRATION,
        availableTerms: AVAILABLE_TERMS,
        ...NO_QUESTIONS,
      }),
    )
  },
  play: async (context) => {
    await showsHeading(EVENT)(context)
    await refresh(context.canvas)
    await showsText(/Zobrazené údaje jsou z posledního úspěšného načtení/)
  },
}

export const SessionEnded: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", DETAIL, 401))
  },
  play: () => showsText("Přihlášení vypršelo. Pro zobrazení přihlášek si vyžádejte nový odkaz."),
}
