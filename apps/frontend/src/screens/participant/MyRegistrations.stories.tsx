import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect } from "storybook/test"

import { apiUrl, failOn, failsOnRefresh, neverAnswer } from "@/screens/msw"
import { screenMeta, showsHeading } from "@/screens/screenMeta"
import { refresh, showsText } from "@/screens/steps"

import { participantHandlers } from "@/features/participant-access/fixtures/handlers"
import { registrationHandlers } from "@/features/registrations/fixtures/handlers"
import { OWN_REGISTRATIONS } from "@/features/registrations/fixtures/participantRegistrations"

const LIST = "/participant/registrations"

const meta = {
  title: "Screens/Participant/MyRegistrations",
  ...screenMeta,
  args: { url: "/my-registrations" },
  beforeEach: ({ msw }) => {
    msw.use(...participantHandlers.signedIn(), ...registrationHandlers.own())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

type Story = StoryObj<typeof meta>

/** The verified participant's registrations (S2-14). */
export const MyRegistrations: Story = {
  play: showsHeading("Jarní výlet na Sněžku"),
}

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", LIST))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status", { name: "Načítání přihlášek" })).toBeVisible()
  },
}

export const Empty: Story = {
  beforeEach: ({ msw }) => {
    msw.use(http.get(apiUrl(LIST), () => HttpResponse.json({ registrations: [] })))
  },
  play: () => showsText("Zatím nemáte žádné přihlášky."),
}

/** The first load failed: an error, never an empty list. */
export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", LIST))
  },
  play: () => showsText("Data se nepodařilo načíst. Zkuste to znovu."),
}

/** A refresh failed: the loaded registrations stay, with their time. */
export const RefreshFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failsOnRefresh("get", LIST, { registrations: OWN_REGISTRATIONS }))
  },
  play: async (context) => {
    await showsHeading("Jarní výlet na Sněžku")(context)
    await refresh(context.canvas)
    await showsText(/Zobrazené údaje jsou z posledního úspěšného načtení/)
  },
}

/** The session ended while the page was open: nothing private, a way to a new link. */
export const SessionEnded: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", LIST, 401))
  },
  play: () => showsText("Přihlášení vypršelo. Pro zobrazení přihlášek si vyžádejte nový odkaz."),
}
