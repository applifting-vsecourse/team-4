import type { Meta, StoryContext, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { failOn, neverAnswer } from "@/screens/msw"
import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { showsText } from "@/screens/steps"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { OWN_REGISTRATION } from "@/features/registrations/fixtures/participantRegistrations"
import {
  CANCEL_TERM_SUMMARY,
  makeChangePreview,
  RELEASING_MOVE_PREVIEW,
} from "@/features/registrations/fixtures/registrationChanges"

const DETAIL = "/participant/registrations/:registrationId"
const CHANGES = `${DETAIL}/changes`
const REVIEW = "Kontrola změn přihlášky"

const meta = {
  title: "Screens/Participant/MyRegistrationEdit",
  ...screenMeta,
  args: { url: `/my-registrations/${OWN_REGISTRATION.id}/edit` },
  beforeEach: ({ msw }) => {
    msw.use(
      ...participantHandlers.signedIn(),
      ...registrationHandlers.own(),
      ...registrationHandlers.ownChange(),
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
 * preview loads, a different dialog of the same name is shown first.
 */
const review = async (name: string | RegExp = REVIEW) => {
  const current = () => screen.getByRole("dialog", { name })
  await waitFor(
    async () => {
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
      await canvas.findByLabelText("Odhlásit z termínu Turnus 1", {}, { timeout: 5000 }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Zkontrolovat změny" }))
    // Only cancelling: the review reads as leaving the term.
    const dialog = await review("Odhlášení")
    await expect(
      dialog.getByText("Storno poplatek a případnou vratku řeší organizátor podle podmínek akce."),
    ).toBeVisible()
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
