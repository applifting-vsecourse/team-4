import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { type ParticipantRegistration } from "@/features/registrations/api/participantRegistrationSchemas"
import { ParticipantRegistrationList } from "@/features/registrations/components/ParticipantRegistrationList"

const { get, FakeHTTPError } = vi.hoisted(() => {
  class FakeHTTPError extends Error {
    constructor(
      public response: { status: number },
      public data: unknown,
    ) {
      super("HTTP error")
    }
  }
  return { get: vi.fn(), FakeHTTPError }
})

vi.mock("@/lib/api-client", () => ({
  api: { get: (...args: unknown[]) => get(...args) as unknown },
  HTTPError: FakeHTTPError,
}))

// The detail link needs a router; the list only needs it to render the href.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    ...rest
  }: {
    children: React.ReactNode
    params: { registrationId: string }
  }) => (
    <a
      href={`/my-registrations/${params.registrationId}`}
      {...rest}
    >
      {children}
    </a>
  ),
}))

const T1 = "0190c0de-0000-7000-8000-000000000001"
const T2 = "0190c0de-0000-7000-8000-000000000002"

const MIXED: ParticipantRegistration = {
  id: "0190c0de-0000-7000-8000-0000000000a1",
  receivedAt: "2026-10-10T07:31:05.000Z",
  event: { name: "Letní tábor Jizerka 2026", location: "Jizerka" },
  terms: [
    {
      termId: T1,
      label: "1. turnus",
      startDate: "2027-07-06",
      endDate: "2027-07-12",
      priceMinor: 450_000,
      status: "confirmed",
    },
    {
      termId: T2,
      label: "2. turnus",
      startDate: "2027-07-13",
      endDate: "2027-07-19",
      priceMinor: 450_000,
      status: "waitlisted",
    },
  ],
  selectedPriceMinor: 900_000,
  amountDueMinor: 450_000,
  paidMinor: 0,
  balanceMinor: 450_000,
  paymentInstructions: {
    amountMinor: 450_000,
    variableSymbol: "2610190042",
    account: { prefix: null, number: "2501234567", bankCode: "2010" },
    reminderAt: "2027-06-28T08:00:00.000Z",
  },
  payments: [],
}

const WAITING: ParticipantRegistration = {
  ...MIXED,
  id: "0190c0de-0000-7000-8000-0000000000a2",
  event: { name: "Podzimní víkend", location: "Krkonoše" },
  terms: [{ ...MIXED.terms[1]!, label: "1. termín" }],
  selectedPriceMinor: 450_000,
  amountDueMinor: 0,
  balanceMinor: 0,
  paymentInstructions: null,
}

const respondWith = (registrations: ParticipantRegistration[]) => ({
  json: () => Promise.resolve({ registrations }),
})
const failWith = (status: number) => ({
  json: () => Promise.reject(new FakeHTTPError({ status }, { statusCode: status })),
})

const plain = (text: string | null | undefined) => text?.replace(/\u00a0/g, " ")

function renderList() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ParticipantRegistrationList
        email="jana@example.com"
        sessionEnded={<p>Přihlášení vypršelo.</p>}
      />
    </QueryClientProvider>,
  )
}

const user = userEvent.setup()

beforeEach(() => {
  get.mockReset()
})

describe("ParticipantRegistrationList", () => {
  it("shows each registration with its terms, own statuses and payment summary", async () => {
    get.mockReturnValue(respondWith([MIXED, WAITING]))
    renderList()

    const mixed = (await screen.findByRole("heading", { name: MIXED.event.name })).closest("li")!
    const terms = within(mixed).getAllByRole("listitem")
    expect(within(terms[0]!).getByText("Potvrzeno")).toBeInTheDocument()
    expect(within(terms[1]!).getByText("Náhradník")).toBeInTheDocument()
    const value = (label: string) =>
      plain(within(mixed).getByText(label, { selector: "dt" }).nextElementSibling?.textContent)
    expect(value("Cena výběru")).toBe("9 000 Kč")
    expect(value("K úhradě za potvrzené termíny")).toBe("4 500 Kč")
    expect(value("Zaplaceno")).toBe("0 Kč")
    expect(value("Zbývá zaplatit")).toBe("4 500 Kč")
    expect(value("Datum připomenutí platby")).toBe("28. 6. 2027 (Europe/Prague)")
    expect(within(mixed).getByRole("link", { name: /Detail přihlášky/ })).toHaveAttribute(
      "href",
      `/my-registrations/${MIXED.id}`,
    )
    expect(screen.getByText("jana@example.com")).toBeInTheDocument()
  })

  it("asks for no payment from waitlisted-only registrations", async () => {
    get.mockReturnValue(respondWith([WAITING]))
    renderList()

    const card = (await screen.findByRole("heading", { name: "Podzimní víkend" })).closest("li")!
    expect(within(card).getByText("Nyní nemáte platební povinnost.")).toBeInTheDocument()
    expect(within(card).queryByText("Zbývá zaplatit")).not.toBeInTheDocument()
    expect(within(card).queryByText("Datum připomenutí platby")).not.toBeInTheDocument()
  })

  it("says there are no registrations", async () => {
    get.mockReturnValue(respondWith([]))
    renderList()
    expect(await screen.findByText("Zatím nemáte žádné přihlášky.")).toBeInTheDocument()
  })

  it("never turns a failed first load into the empty state, and retries", async () => {
    get.mockReturnValueOnce(failWith(500)).mockReturnValue(respondWith([MIXED]))
    renderList()

    expect(
      await screen.findByText("Data se nepodařilo načíst. Zkuste to znovu."),
    ).toBeInTheDocument()
    expect(screen.queryByText("Zatím nemáte žádné přihlášky.")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByRole("heading", { name: MIXED.event.name })).toBeInTheDocument()
  })

  it("keeps the old data and says so when a refresh fails, then shows the new payments", async () => {
    get.mockReturnValueOnce(respondWith([MIXED])).mockReturnValueOnce(failWith(500))
    renderList()
    await screen.findByRole("heading", { name: MIXED.event.name })

    await user.click(screen.getByRole("button", { name: "Aktualizovat" }))
    expect(
      await screen.findByText(/Zobrazené údaje jsou z posledního úspěšného načtení/),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: MIXED.event.name })).toBeInTheDocument()

    get.mockReturnValue(respondWith([{ ...MIXED, paidMinor: 200_000, balanceMinor: 250_000 }]))
    await user.click(screen.getAllByRole("button", { name: /Aktualizovat|Zkusit znovu/ })[0]!)
    expect(await screen.findByText("2 500 Kč", { selector: "span" })).toBeInTheDocument()
    expect(screen.queryByText(/Zobrazené údaje jsou z posledního/)).not.toBeInTheDocument()
  })

  it("hides everything private and offers a new link once the session has ended", async () => {
    get.mockReturnValue(failWith(401))
    renderList()
    expect(await screen.findByText("Přihlášení vypršelo.")).toBeInTheDocument()
    expect(screen.queryByText("Zatím nemáte žádné přihlášky.")).not.toBeInTheDocument()
  })
})
