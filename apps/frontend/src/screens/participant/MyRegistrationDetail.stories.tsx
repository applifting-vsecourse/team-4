import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { failOn, failsOnRefresh, neverAnswer } from "@/screens/msw"
import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { openDialog, refresh, showsText } from "@/screens/steps"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { programmeHandlers } from "@/features/programme/fixtures/handlers"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import {
  AVAILABLE_TERMS,
  OWN_REGISTRATION,
  SETTLED_REGISTRATION,
} from "@/features/registrations/fixtures/participantRegistrations"
import {
  CANCEL_ALL_SUMMARY,
  makeChangePreview,
  makeOwnChange,
} from "@/features/registrations/fixtures/registrationChanges"

const DETAIL = "/participant/registrations/:registrationId"
const CHANGES = `${DETAIL}/changes`
const PROGRAMME = `${DETAIL}/terms/:termId/programme`
const EVENT = OWN_REGISTRATION.event.name

const meta = {
  title: "Screens/Participant/MyRegistrationDetail",
  ...screenMeta,
  args: { url: `/my-registrations/${OWN_REGISTRATION.id}` },
  beforeEach: ({ msw }) => {
    msw.use(
      ...participantHandlers.signedIn(),
      ...registrationHandlers.own(),
      ...programmeHandlers.participant(),
    )
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** One own registration with payment instructions, payments and the programme of the confirmed term (S2-14, F65). */
export const MyRegistrationDetail: Story = {
  play: async (context) => {
    await showsHeading(EVENT)(context)
    // Turnus 2 waits: its programme opens only after confirmation.
    await showsText("Program je dostupný až po potvrzení účasti v tomto termínu.")
  },
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

/** A request waits for the organizer: it is shown, editing is closed. */
export const RequestPending: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownChanges([makeOwnChange()]),
      ...registrationHandlers.ownRegistration({ ...OWN_REGISTRATION, canChange: false }),
    )
  },
  play: () => showsText("Čeká na schválení"),
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
  play: () => showsText("Zamítnuto"),
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

/** The whole registration was cancelled: marked, no further changes. */
export const RegistrationCancelled: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration({
        ...OWN_REGISTRATION,
        terms: OWN_REGISTRATION.terms.map((term) => ({ ...term, status: "cancelled" })),
        isCancelled: true,
        canChange: false,
      }),
    )
  },
  play: async (context) => {
    await showsText("Odhlášená přihláška")
    await expect(
      context.canvas.queryByRole("button", { name: "Zrušit účast" }),
    ).not.toBeInTheDocument()
  },
}

/** "Zrušit účast" shows what leaving means before anything is sent. */
export const CancelRegistrationDialog: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownChange(
        makeChangePreview({ kinds: ["cancel_all"], summary: CANCEL_ALL_SUMMARY }),
      ),
    )
  },
  play: async ({ canvas }) => {
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
  play: () => showsText("Program se nepodařilo načíst"),
}

export const ProgrammeNotReady: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...programmeHandlers.participantEmpty())
  },
  play: () => showsText("Program zatím není připravený."),
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
      ...failsOnRefresh("get", DETAIL, { ...OWN_REGISTRATION, availableTerms: AVAILABLE_TERMS }),
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
