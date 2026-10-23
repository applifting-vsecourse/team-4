import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { type ParticipantRegistration } from "@/features/registrations/api/participantRegistrationSchemas"
import { ParticipantRegistrationDetail } from "@/features/registrations/components/ParticipantRegistrationDetail"

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

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

const REGISTRATION: ParticipantRegistration = {
  id: "0190c0de-0000-7000-8000-0000000000a1",
  receivedAt: "2026-10-10T07:31:05.000Z",
  event: { name: "Letní tábor Jizerka 2026", location: "Tábořiště Jizerka, Kořenov" },
  terms: [
    {
      termId: "0190c0de-0000-7000-8000-000000000001",
      label: "1. turnus",
      startDate: "2027-07-06",
      endDate: "2027-07-12",
      priceMinor: 450_000,
      status: "confirmed",
    },
    {
      termId: "0190c0de-0000-7000-8000-000000000002",
      label: "2. turnus",
      startDate: "2027-07-13",
      endDate: "2027-07-19",
      priceMinor: 450_000,
      status: "waitlisted",
    },
  ],
  selectedPriceMinor: 900_000,
  amountDueMinor: 450_000,
  paidMinor: 200_000,
  balanceMinor: 250_000,
  paymentInstructions: {
    amountMinor: 250_000,
    variableSymbol: "2610190042",
    account: { prefix: null, number: "2501234567", bankCode: "2010" },
    reminderAt: "2027-06-28T08:00:00.000Z",
  },
  payments: [
    { id: "0190c0de-0000-7000-8000-0000000000b1", receivedOn: "2026-10-15", amountMinor: 200_000 },
  ],
}

const respondWith = (body: unknown) => ({ json: () => Promise.resolve(body) })
const failWith = (status: number) => ({
  json: () => Promise.reject(new FakeHTTPError({ status }, { statusCode: status })),
})
const plain = (text: string | null | undefined) => text?.replace(/\u00a0/g, " ")

function renderDetail() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ParticipantRegistrationDetail
        registrationId={REGISTRATION.id}
        sessionEnded={<p>Přihlášení vypršelo.</p>}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  get.mockReset()
})

describe("ParticipantRegistrationDetail", () => {
  it("shows the event, terms, payment summary with instructions and the payment history", async () => {
    get.mockReturnValue(respondWith(REGISTRATION))
    renderDetail()

    expect(
      await screen.findByRole("heading", { name: "Letní tábor Jizerka 2026" }),
    ).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith(`participant/registrations/${REGISTRATION.id}`)
    expect(screen.getByText("Tábořiště Jizerka, Kořenov")).toBeInTheDocument()
    expect(screen.getByText("Potvrzeno")).toBeInTheDocument()
    expect(screen.getByText("Náhradník")).toBeInTheDocument()

    const value = (label: string) =>
      plain(screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent)
    expect(value("Zaplaceno")).toBe("2 000 Kč")
    expect(value("Zbývá zaplatit")).toBe("2 500 Kč")
    expect(value("Číslo účtu")).toBe("2501234567/2010")
    expect(value("Variabilní symbol")).toBe("2610190042")
    expect(value("Datum připomenutí platby")).toBe("28. 6. 2027 (Europe/Prague)")

    const history = screen.getByText("Přijaté platby").closest<HTMLElement>("[data-slot=card]")!
    expect(within(history).getByText("15. 10. 2026")).toBeInTheDocument()
    expect(plain(within(history).getByText(/2\s000/).textContent)).toBe("2 000 Kč")
  })

  it("says no payment has been recorded yet", async () => {
    get.mockReturnValue(respondWith({ ...REGISTRATION, payments: [], paidMinor: 0 }))
    renderDetail()
    expect(await screen.findByText("Zatím nebyla zaznamenána žádná platba.")).toBeInTheDocument()
  })

  it("stops asking for payment once settled", async () => {
    get.mockReturnValue(
      respondWith({
        ...REGISTRATION,
        paidMinor: 450_000,
        balanceMinor: 0,
        paymentInstructions: null,
      }),
    )
    renderDetail()
    await screen.findByText("Zbývá zaplatit")
    expect(screen.queryByText("Variabilní symbol")).not.toBeInTheDocument()
    expect(screen.queryByText("Datum připomenutí platby")).not.toBeInTheDocument()
  })

  it("offers the way back without revealing anything for an unavailable registration", async () => {
    get.mockReturnValue(failWith(404))
    renderDetail()
    expect(await screen.findByText("Záznam není dostupný")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Zpět na moje přihlášky" })).toHaveAttribute(
      "href",
      "/my-registrations",
    )
  })

  it("asks for a new link when the session has ended", async () => {
    get.mockReturnValue(failWith(401))
    renderDetail()
    expect(await screen.findByText("Přihlášení vypršelo.")).toBeInTheDocument()
  })

  it("never shows a failed first load as an empty detail", async () => {
    get.mockReturnValue(failWith(500))
    renderDetail()
    expect(
      await screen.findByText("Data se nepodařilo načíst. Zkuste to znovu."),
    ).toBeInTheDocument()
    expect(screen.queryByText("Termíny")).not.toBeInTheDocument()
  })
})
