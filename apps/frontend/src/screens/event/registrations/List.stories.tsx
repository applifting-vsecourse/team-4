import type { Meta, StoryObj } from "@storybook/react-vite"
import { delay, http, HttpResponse } from "msw"
import { expect, screen, userEvent, waitFor } from "storybook/test"

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

/**
 * Another filter is loading: the previous rows stay, so the page does not
 * shrink and move the organizer away from the filters (S4-01).
 */
export const SwitchingFilter: Story = {
  beforeEach: ({ msw }) => {
    msw.use(
      // Only the filtered list never answers; the unfiltered one falls through.
      http.get(apiUrl(LIST), async ({ request }) => {
        if (!new URL(request.url).searchParams.has("termId")) return undefined
        await delay("infinite")
      }),
    )
  },
  play: async (context) => {
    await showsHeading("Seznam přihlášek")(context)
    const { canvas } = context
    const [row] = await canvas.findAllByRole("row", { name: /Zaplaceno|Bez povinnosti/ })
    await userEvent.click(canvas.getByRole("combobox", { name: "Termín" }))
    await userEvent.click(await screen.findByRole("option", { name: "Turnus 1" }))
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument())
    // The filter is applied while its rows are still on the way.
    await expect(canvas.getByRole("combobox", { name: "Termín" })).toHaveTextContent("Turnus 1")
    await expect(row).toBeVisible()
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
