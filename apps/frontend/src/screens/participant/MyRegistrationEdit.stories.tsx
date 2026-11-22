import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { participantPlacementHandlers } from "@/features/accommodation/fixtures/participantPlacements"
import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { programmeHandlers } from "@/features/programme/fixtures/handlers"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import {
  AVAILABLE_TERMS,
  OWN_REGISTRATION,
} from "@/features/registrations/fixtures/participantRegistrations"
import {
  ADD_TERM_PREVIEW,
  CANCEL_TERM_SUMMARY,
  makeChangePreview,
  PENDING_ADD_PREVIEW,
  RELEASING_MOVE_PREVIEW,
  REPLACE_TERM_PREVIEW,
} from "@/features/registrations/fixtures/registrationChanges"

const DETAIL = "/participant/registrations/:registrationId"
const CHANGES = `${DETAIL}/changes`
const REVIEW = "Kontrola změn přihlášky"
const MOBILE = { viewport: { value: "mobile", isRotated: false } }

const meta = {
  title: "Screens/Participant/MyRegistrationEdit",
  ...screenMeta,
  args: { url: `/my-registrations/${OWN_REGISTRATION.id}/edit` },
  beforeEach: ({ msw }) => {
    msw.use(
      ...participantHandlers.signedIn(),
      ...registrationHandlers.own(),
      ...registrationHandlers.ownChange(),
      ...registrationHandlers.roommateWishes(),
      // After a saved change the detail opens and loads the programme.
      ...programmeHandlers.participant(),
      // The detail shows the rooms of its confirmed terms (S4-02).
      ...participantPlacementHandlers(),
    )
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** A new phone number, then "Zkontrolovat změny": the server's review opens. */
async function changePhone({ canvas }: Pick<StoryContext, "canvas">) {
  const phone = await canvas.findByLabelText("Telefon", {}, { timeout: 5000 })
  await userEvent.clear(phone)
  await userEvent.type(phone, "+420 731 987 654")
  await userEvent.click(canvas.getByRole("button", { name: "Zkontrolovat změny" }))
}

/**
 * The review dialog with the server's preview, once it faded in. While the
 * preview loads, a dialog of the same name and description shows a loading
 * status first; wait until that status is gone.
 */
const review = async (name: string | RegExp = REVIEW) => {
  const current = () => screen.getByRole("dialog", { name })
  await waitFor(
    async () => {
      await expect(within(current()).queryByText("Načítám kontrolu změn…")).not.toBeInTheDocument()
      await expect(within(current()).getByText(/Původní a navržené údaje/)).toBeInTheDocument()
      await expect(current()).toBeVisible()
    },
    { timeout: 5000 },
  )
  return within(current())
}

/** Contact, gender, terms and needs prefilled for change (F35-2a). */
export const EditForm: Story = { play: showsHeading("Úprava přihlášky") }

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", DETAIL))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status", { name: "Načítání přihlášky" })).toBeVisible()
  },
}

export const NothingChanged: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Zkontrolovat změny" }))
    await showsText(/Nic jste nezměnili/)
  },
}

export const ValidationError: Story = {
  play: async ({ canvas }) => {
    await userEvent.clear(await canvas.findByLabelText("Telefon"))
    await userEvent.click(canvas.getByRole("button", { name: "Zkontrolovat změny" }))
    await showsText(/Zadejte telefon s mezinárodní předvolbou/)
  },
}

/** Outside the approval period: the change applies at once. */
export const ReviewDirectChange: Story = {
  play: async (context) => {
    await changePhone(context)
    const dialog = await review()
    await expect(dialog.getByRole("button", { name: "Potvrdit změnu" })).toBeVisible()
  },
}

/** Inside the approval period: sent as a request, the registration stays as it is. */
export const ReviewNeedsApproval: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.ownChange(makeChangePreview({ requiresApproval: true })))
  },
  play: async (context) => {
    await changePhone(context)
    const dialog = await review()
    await expect(
      await dialog.findByText(
        "Změnu musí schválit organizátor. Do té doby platí současná přihláška.",
      ),
    ).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Odeslat žádost o schválení" })).toBeVisible()
  },
}

/** A move gives up a confirmed place: sent only after explicit consent. */
export const ReviewMoveReleasingConfirmed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.ownChange(RELEASING_MOVE_PREVIEW))
  },
  play: async (context) => {
    await changePhone(context)
    await review()
    await showsText(/Přesunem přijdete o potvrzené místo/)
    await expect(await screen.findByRole("button", { name: "Potvrdit změnu" })).toBeDisabled()
  },
}

/** Leaving a confirmed term changes the money: fees are up to the organizer. */
export const ReviewCancelTerm: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownChange(
        makeChangePreview({ kinds: ["cancel_terms"], summary: CANCEL_TERM_SUMMARY }),
      ),
    )
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: /^Turnus 1/ }, { timeout: 5000 }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Zkontrolovat změny" }))
    // Only cancelling: the review reads as leaving the term.
    const dialog = await review("Odhlášení")
    await expect(
      dialog.getByText("Storno poplatek a případnou vratku řeší organizátor podle podmínek akce."),
    ).toBeVisible()
  },
}

/** One list of the event's terms: the held ones are ticked, another can be ticked to add it (F35-2c). */
export const AddTermAvailable: Story = {
  play: async ({ canvas }) => {
    const free = await canvas.findByRole("checkbox", { name: /^Turnus 3/ }, { timeout: 5000 })
    await expect(free).not.toBeChecked()
    await expect(canvas.getByRole("checkbox", { name: /^Turnus 1/ })).toBeChecked()
    await expect(canvas.getByRole("checkbox", { name: /^Turnus 2/ })).toBeChecked()
  },
}

/** Unticking a held term and ticking another: the review lists what stays, is added and is removed. */
export const ReviewReplaceTerm: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.ownChange(REPLACE_TERM_PREVIEW))
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: /^Turnus 1/ }, { timeout: 5000 }),
    )
    await userEvent.click(canvas.getByRole("checkbox", { name: /^Turnus 3/ }))
    await userEvent.click(canvas.getByRole("button", { name: "Zkontrolovat změny" }))
    const dialog = await review()
    // Turnus 2 stays, Turnus 1 is removed and Turnus 3 is added.
    await expect(dialog.getByRole("row", { name: /Turnus 1.*Odhlášeno/ })).toBeVisible()
    await expect(dialog.getByRole("row", { name: /Turnus 2/ })).toBeVisible()
    await expect(dialog.getByRole("row", { name: /Turnus 3/ })).toBeVisible()
  },
}

/** Ticking a free term says what happens next: the others stay, the capacity decides. */
export const AddTermNotice: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: /^Turnus 3/ }, { timeout: 5000 }),
    )
    const notice = await canvas.findByRole("status")
    await expect(notice).toHaveTextContent("Přidání termínu Turnus 3")
    await expect(notice).toHaveTextContent("Stávající termíny zůstanou")
    await expect(notice).toHaveTextContent("jinak budete náhradníkem")
  },
}

/** Unticking a held term says that the place is released and the fee is up to the organizer. */
export const RemoveTermNotice: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: /^Turnus 1/ }, { timeout: 5000 }),
    )
    const notice = await canvas.findByRole("status")
    await expect(notice).toHaveTextContent("Odhlášení z termínu Turnus 1")
    await expect(notice).toHaveTextContent("Místo se uvolní")
  },
}

/** Unticking every term warns that the whole registration is cancelled. */
export const RemoveAllTermsNotice: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: /^Turnus 1/ }, { timeout: 5000 }),
    )
    await userEvent.click(canvas.getByRole("checkbox", { name: /^Turnus 2/ }))
    await expect(await canvas.findByText("Odhlášení ze všech termínů")).toBeVisible()
    await expect(canvas.getByText(/Celá přihláška bude odhlášená/)).toBeVisible()
  },
}

/** The review with pending badges on both sides and the approval notice stays inside the dialog. */
export const ReviewStaysInsideDialog: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.ownChange(PENDING_ADD_PREVIEW))
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: /^Turnus 3/ }, { timeout: 5000 }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Zkontrolovat změny" }))
    const dialog = await review()
    const element = screen.getByRole("dialog")
    // The content ends before the dialog's own right padding, not just before its edge.
    const inner =
      element.getBoundingClientRect().right - parseFloat(getComputedStyle(element).paddingRight)
    for (const part of element.querySelectorAll("[role=alert], [data-slot=table-container]")) {
      await expect(part.getBoundingClientRect().right).toBeLessThanOrEqual(inner + 1)
    }
    await expect(dialog.getByRole("button", { name: "Odeslat žádost o schválení" })).toBeVisible()
  },
}

/** At 360 px the review stacks each term and amount as labelled lines: nothing scrolls sideways. */
export const ReviewMobile: Story = {
  globals: MOBILE,
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.ownChange(PENDING_ADD_PREVIEW))
  },
  play: async ({ canvas }) => {
    // Browsers with classic scrollbars (CI) give the scrolling dialog 15 px less width than
    // the overlay scrollbars of a Mac, so the review is checked at that narrower width.
    const scrollbar = document.createElement("style")
    scrollbar.textContent = "[role=dialog] { padding-right: 39px !important; }"
    document.head.append(scrollbar)
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: /^Turnus 3/ }, { timeout: 5000 }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Zkontrolovat změny" }))
    const dialog = await review()
    await expect(dialog.getAllByText("Původně").length).toBeGreaterThan(0)
    for (const table of screen
      .getByRole("dialog")
      .querySelectorAll("[data-slot=table-container]")) {
      await expect(table.scrollWidth).toBeLessThanOrEqual(table.clientWidth)
    }
    scrollbar.remove()
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
    // The content is taller than the screen: the dialog scrolls and reaches the confirming button.
    const element = screen.getByRole("dialog")
    await expect(element.scrollHeight).toBeGreaterThan(element.clientHeight)
    const confirm = dialog.getByRole("button", { name: "Odeslat žádost o schválení" })
    confirm.scrollIntoView()
    await expect(confirm.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight)
  },
}

/** Several terms are free to add: each one is a row of its own. */
export const AddTermSeveralAvailable: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration(OWN_REGISTRATION, [
        ...AVAILABLE_TERMS,
        {
          termId: "0190c0de-0000-7000-8000-000000000104",
          label: "Turnus 4",
          startDate: "2027-09-01",
          endDate: "2027-09-14",
          priceMinor: 450_000,
        },
      ]),
    )
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: /^Turnus 3/ }, { timeout: 5000 }),
    ).toBeVisible()
    await expect(canvas.getByRole("checkbox", { name: /^Turnus 4/ })).toBeVisible()
  },
}

/** Ticking the term opens a review that shows it as new and how it is evaluated. */
export const ReviewAddTerm: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.ownChange(ADD_TERM_PREVIEW))
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: /^Turnus 3/ }, { timeout: 5000 }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Zkontrolovat změny" }))
    const dialog = await review()
    await expect(dialog.getByText("Turnus 3")).toBeVisible()
    await expect(
      dialog.getByText(/Účast v termínu Turnus 3 se vyhodnotí podle kapacity/),
    ).toBeVisible()
    await expect(dialog.getByText(/se k ceně přidá/)).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Potvrdit změnu" })).toBeVisible()
  },
}

/** The registration already holds every term of the event. */
export const NoFurtherTerm: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration(
        OWN_REGISTRATION,
        AVAILABLE_TERMS.filter((term) =>
          OWN_REGISTRATION.terms.some((own) => own.termId === term.termId),
        ),
      ),
    )
  },
  play: async ({ canvas }) => {
    await showsText("Další termín není k dispozici, na přihlášce už máte všechny termíny akce.")
    await expect(canvas.queryByRole("checkbox", { name: /^Turnus 3/ })).not.toBeInTheDocument()
  },
}

/** The server refuses the addition: the held terms stay as they were. */
export const AddTermFailed: Story = {
  beforeEach: ({ msw }) => {
    // The first matching handler answers: the save fails after the review loaded.
    msw.use(...failOn("post", CHANGES), ...registrationHandlers.ownChange(ADD_TERM_PREVIEW))
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: /^Turnus 3/ }, { timeout: 5000 }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Zkontrolovat změny" }))
    const dialog = await review()
    await userEvent.click(dialog.getByRole("button", { name: "Potvrdit změnu" }))
    await showsText("Změnu se nepodařilo odeslat. Zkuste to prosím znovu.")
  },
}

export const PreviewFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", `${CHANGES}/preview`))
  },
  play: async (context) => {
    await changePhone(context)
    await showsText("Kontrolu změn se nepodařilo načíst. Zkuste to prosím znovu.")
  },
}

export const Submitting: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("post", CHANGES))
  },
  play: async (context) => {
    await changePhone(context)
    const dialog = await review()
    await userEvent.click(dialog.getByRole("button", { name: "Potvrdit změnu" }))
    await expect(await dialog.findByRole("button", { name: "Potvrdit změnu" })).toBeDisabled()
  },
}

export const SubmitFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", CHANGES))
  },
  play: async (context) => {
    await changePhone(context)
    const dialog = await review()
    await userEvent.click(dialog.getByRole("button", { name: "Potvrdit změnu" }))
    await showsText("Změnu se nepodařilo odeslat. Zkuste to prosím znovu.")
  },
}

/** The registration changed since the review: reload, nothing was saved. */
export const StaleProposal: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("post", CHANGES, 409, { code: "registration_stale" }))
  },
  play: async (context) => {
    await changePhone(context)
    const dialog = await review()
    await userEvent.click(dialog.getByRole("button", { name: "Potvrdit změnu" }))
    await showsText("Přihláška se mezitím změnila. Načtěte ji znovu a změnu potvrďte.")
  },
}

/** The approval period started meanwhile: the change can only be requested now. */
export const ApprovalNewlyRequired: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...failOn("post", CHANGES, 409, {
        code: "approval_changed",
        preview: makeChangePreview({ requiresApproval: true }),
      }),
    )
  },
  play: async (context) => {
    await changePhone(context)
    const dialog = await review()
    await userEvent.click(dialog.getByRole("button", { name: "Potvrdit změnu" }))
    await showsText("Mezitím začalo platit schvalování změn. Změnu můžete odeslat jen jako žádost.")
  },
}

/** Saved: back on the detail of the registration. */
export const ChangeApplied: Story = {
  play: async (context) => {
    await changePhone(context)
    const dialog = await review()
    await userEvent.click(dialog.getByRole("button", { name: "Potvrdit změnu" }))
    await showsHeading(OWN_REGISTRATION.event.name)(context)
  },
}

/** A request waits for the organizer: nothing more can be changed. */
export const LockedByPendingRequest: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...registrationHandlers.ownRegistration({ ...OWN_REGISTRATION, canChange: false }))
  },
  play: () => showsText(/Žádost o změnu čeká na schválení organizátora/),
}

export const RegistrationCancelled: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      ...registrationHandlers.ownRegistration({
        ...OWN_REGISTRATION,
        isCancelled: true,
        canChange: false,
      }),
    )
  },
  play: () => showsText("Přihláška je odhlášená, úpravy nejsou dostupné."),
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

export const SessionEnded: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", DETAIL, 401))
  },
  play: () => showsText("Přihlášení vypršelo. Pro zobrazení přihlášek si vyžádejte nový odkaz."),
}
