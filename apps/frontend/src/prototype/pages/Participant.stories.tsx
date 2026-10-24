import type { Meta, StoryObj } from "@storybook/react-vite"
import { delay, http, HttpResponse } from "msw"
import { expect } from "storybook/test"

import { ROUTES } from "@/app/routes"
import { MOCK_API } from "@/prototype/mockBackend/handlers"
import { LINK_REQUESTED_MESSAGE } from "@/prototype/mockBackend/MockBackend"
import { DEMO } from "@/prototype/mockBackend/scenarios"
import { DARK, fill, knownIssues, MOBILE, prototypeMeta, urls } from "@/prototype/prototypeStories"

// Účet účastníka (S2-13, S2-14): a magic link instead of a password, then the
// participant's own registrations across organizations. Anna has two.
const meta = {
  ...prototypeMeta,
  title: "Pages/Participant",
  args: { ...prototypeMeta.args, route: ROUTES.myRegistrations },
} satisfies Meta<typeof prototypeMeta.component>

export default meta

type Story = StoryObj<typeof meta>

const INVALID_LINK =
  "Odkaz už není platný: byl použit, vypršel nebo není správný. Vyžádejte si nový."

/** Without a session the visitor asks for a link; the organizer sign-in is elsewhere. */
export const RequestLink: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await fill(userEvent, canvasElement, { "E-mail": DEMO.anna.email })
    await userEvent.click(canvas.getByRole("button", { name: "Poslat přihlašovací odkaz" }))
    // The same answer for every e-mail, so it reveals nothing.
    await expect(await canvas.findByRole("status")).toHaveTextContent(LINK_REQUESTED_MESSAGE)
  },
}

export const RequestLinkMobile: Story = { globals: MOBILE }

export const RequestLinkDark: Story = { globals: DARK }

export const RequestLinkValidation: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await fill(userEvent, canvasElement, { "E-mail": "anna@" })
    await userEvent.click(canvas.getByRole("button", { name: "Poslat přihlašovací odkaz" }))
    await expect(await canvas.findByText("Zadejte e-mail ve správném tvaru.")).toBeVisible()
  },
}

/** A used, expired or made-up link: the way to a new one is right there. */
export const InvalidLink: Story = {
  args: { route: "/my-registrations/verify?token=pouzity-odkaz" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(INVALID_LINK)).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Poslat přihlašovací odkaz" })).toBeVisible()
  },
}

export const LinkWithoutToken: Story = {
  args: { route: "/my-registrations/verify" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(INVALID_LINK)).toBeVisible()
  },
}

/** Anna's registrations in two organizations' events, newest first. */
export const MyRegistrations: Story = {
  args: { participant: "anna" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("link", { name: `Detail přihlášky ${DEMO.robotics.name}` }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("link", { name: `Detail přihlášky ${DEMO.summerCamp.name}` }),
    ).toBeVisible()
  },
}

export const MyRegistrationsMobile: Story = { args: { participant: "anna" }, globals: MOBILE }

export const MyRegistrationsDark: Story = { args: { participant: "anna" }, globals: DARK }

export const MyRegistrationsLoading: Story = {
  args: { participant: "anna" },
  beforeEach: ({ msw }) => {
    msw.use(
      http.get(MOCK_API.participantRegistrations, async () => {
        await delay("infinite")
        return HttpResponse.json({})
      }),
    )
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status", { name: "Načítání přihlášek" })).toBeVisible()
  },
}

/** A failed first load is never shown as "no registrations". */
export const MyRegistrationsLoadError: Story = {
  args: { participant: "anna" },
  parameters: knownIssues("destructiveAlertContrast"),
  beforeEach: ({ msw }) => {
    msw.use(
      http.get(MOCK_API.participantRegistrations, () => HttpResponse.json({}, { status: 500 })),
    )
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: "Zkusit znovu" })).toBeVisible()
    await expect(canvas.queryByText("Zatím nemáte žádné přihlášky.")).toBeNull()
  },
}

/** The 7-day session ended while the page was open (S2-13). */
export const SessionEnded: Story = {
  args: { participant: "anna" },
  beforeEach: ({ msw }) => {
    msw.use(
      http.get(MOCK_API.participantRegistrations, () => HttpResponse.json({}, { status: 401 })),
    )
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        "Přihlášení vypršelo. Pro zobrazení přihlášek si vyžádejte nový odkaz.",
      ),
    ).toBeVisible()
  },
}

/** Still owing: the account, variable symbol and reminder date to pay with. */
export const RegistrationDetail: Story = {
  args: { participant: "anna", route: urls.myRegistration(DEMO.registrations.annaSummer) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: DEMO.summerCamp.name })).toBeVisible()
    await expect(canvas.getByText("1000051")).toBeVisible()
    await expect(canvas.getByText("Zatím nebyla zaznamenána žádná platba.")).toBeVisible()
  },
}

export const RegistrationDetailMobile: Story = {
  args: { participant: "anna", route: urls.myRegistration(DEMO.registrations.annaSummer) },
  globals: MOBILE,
}

export const RegistrationDetailDark: Story = {
  args: { participant: "anna", route: urls.myRegistration(DEMO.registrations.annaSummer) },
  globals: DARK,
}

/** Paid in full: no request to pay, the payment in the history. */
export const RegistrationDetailPaid: Story = {
  args: { participant: "anna", route: urls.myRegistration(DEMO.registrations.annaRobotics) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: DEMO.robotics.name })).toBeVisible()
    await expect(canvas.getByText("2. 10. 2026")).toBeVisible()
    await expect(canvas.queryByText("Variabilní symbol")).toBeNull()
  },
}

/** Someone else's registration looks like a missing one. */
export const SomeoneElsesRegistration: Story = {
  args: { participant: "anna", route: urls.myRegistration(DEMO.registrations.jakub) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Záznam není dostupný")).toBeVisible()
  },
}

/** The detail behind a link without a session asks for a new link. */
export const DetailWithoutSession: Story = {
  args: { route: urls.myRegistration(DEMO.registrations.annaSummer) },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("button", { name: "Poslat přihlašovací odkaz" }),
    ).toBeVisible()
    await expect(canvas.queryByText(DEMO.summerCamp.name)).toBeNull()
  },
}

export const SignOut: Story = {
  args: { participant: "anna" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Odhlásit se" }))
    await expect(
      await canvas.findByRole("button", { name: "Poslat přihlašovací odkaz" }),
    ).toBeVisible()
  },
}
