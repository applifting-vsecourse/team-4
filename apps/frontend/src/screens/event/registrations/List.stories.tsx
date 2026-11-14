import type { Meta, StoryObj } from "@storybook/react-vite"
import { http, HttpResponse } from "msw"
import { expect } from "storybook/test"

import { apiUrl, failOn, failsOnRefresh, neverAnswer } from "@/screens/msw"
import { eventUrl, organizerBackend, screenMeta, showsHeading } from "@/screens/screenMeta"
import { refresh, showsText } from "@/screens/steps"

import { makeRegistrationList } from "@/features/registrations/fixtures/registrations"

const LIST = "/organizations/:organizationId/events/:eventId/registrations"
const empty = () => [
  http.get(apiUrl(LIST), () =>
    HttpResponse.json({ ...makeRegistrationList(), registrations: [], total: 0 }),
  ),
]

const meta = {
  title: "Screens/Event/Registrations/List",
  ...screenMeta,
  args: { url: eventUrl("/registrations") },
  beforeEach: ({ msw }) => {
    msw.use(...organizerBackend())
  },
} satisfies Meta<typeof screenMeta.component>

export default meta

function textLeft(element: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(element)
  return range.getBoundingClientRect().left
}

/** Registrations of an event with filters (S2-11). */
export const Registrations: StoryObj<typeof meta> = {
  play: async (context) => {
    await showsHeading("Seznam přihlášek")(context)
    const { canvas } = context
    const paymentHeader = await canvas.findByRole("columnheader", { name: "Platba" })
    const paid = canvas.getByText("Zaplaceno", { exact: true })
    const noPayment = canvas.getByText("Bez povinnosti", { exact: true })
    await expect(Math.abs(textLeft(paid) - textLeft(paymentHeader))).toBeLessThanOrEqual(1)
    await expect(Math.abs(textLeft(noPayment) - textLeft(paymentHeader))).toBeLessThanOrEqual(1)
  },
}

type Story = StoryObj<typeof meta>

export const Loading: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...neverAnswer("get", LIST))
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status", { name: "Načítání přihlášek" })).toBeVisible()
  },
}

export const NoRegistrations: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...empty())
  },
  play: () => showsText("Tato akce zatím nemá žádné přihlášky."),
}

/** Filters from the URL match nothing: the way back to all registrations. */
export const NoMatch: Story = {
  args: { url: eventUrl("/registrations?status=waitlisted") },
  beforeEach: ({ msw }) => {
    msw.use(
      http.get(apiUrl(LIST), () =>
        HttpResponse.json({ ...makeRegistrationList(), registrations: [] }),
      ),
    )
  },
  play: () => showsText("Žádná přihláška neodpovídá filtrům."),
}

export const LoadFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failOn("get", LIST))
  },
  play: () => showsText("Data se nepodařilo načíst"),
}

export const RefreshFailed: Story = {
  beforeEach: ({ msw }) => {
    msw.use(...failsOnRefresh("get", LIST, makeRegistrationList()))
  },
  play: async (context) => {
    await showsHeading("Seznam přihlášek")(context)
    await refresh(context.canvas)
    await showsText(/Zobrazené údaje jsou z posledního úspěšného načtení/)
  },
}
