import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { type RegistrationDetail as Detail } from "@/features/registrations/api/eventRegistrationSchemas"
import { RegistrationDetail } from "@/features/registrations/components/RegistrationDetail"

const T1 = "0190c0de-0000-7000-8000-000000000001"
const T2 = "0190c0de-0000-7000-8000-000000000002"

const MIXED: Detail = {
  id: "0190c0de-0000-7000-8000-0000000000a1",
  receivedAt: "2026-10-10T07:31:05.000Z",
  firstName: "Eliška",
  lastName: "Svobodová",
  email: "eliska@example.test",
  phone: "+420601234567",
  terms: [
    {
      termId: T1,
      label: "1. turnus",
      startDate: "2027-07-01",
      endDate: "2027-07-07",
      priceMinor: 790_000,
      status: "confirmed",
    },
    {
      termId: T2,
      label: "2. turnus",
      startDate: "2027-07-15",
      endDate: "2027-07-21",
      priceMinor: 390_000,
      status: "waitlisted",
    },
  ],
  selectedPriceMinor: 1_180_000,
  amountDueMinor: 790_000,
  paidMinor: 190_000,
  balanceMinor: 600_000,
  paymentState: "partial",
  // 28 June 2027, 10:00 in Prague.
  reminderAt: "2027-06-28T08:00:00.000Z",
  variableSymbol: "2027094",
  payments: [
    { id: "0190c0de-0000-7000-8000-0000000000b1", receivedOn: "2026-10-12", amountMinor: 90_000 },
    { id: "0190c0de-0000-7000-8000-0000000000b2", receivedOn: "2026-10-14", amountMinor: 100_000 },
  ],
}

// 20. 10. 2026 14:03 in Prague.
const UPDATED_AT = Date.parse("2026-10-20T12:03:00Z")

function renderDetail(
  registration: Detail,
  state: { isRefreshing?: boolean; hasRefreshFailed?: boolean } = {},
) {
  const onRefresh = vi.fn()
  render(
    <RegistrationDetail
      registration={registration}
      updatedAt={UPDATED_AT}
      isRefreshing={state.isRefreshing ?? false}
      hasRefreshFailed={state.hasRefreshFailed ?? false}
      onRefresh={onRefresh}
    />,
  )
  return { onRefresh }
}

/** Text with Intl's non-breaking spaces as plain ones. */
const plain = (text: string | null | undefined) => text?.replace(/\u00a0/g, " ")

/** The value next to a label in a summary. */
function valueOf(label: string) {
  return plain(screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent)
}

describe("RegistrationDetail", () => {
  it("shows contacts and each term with its dates, price and own status", () => {
    renderDetail(MIXED)
    expect(valueOf("Jméno a příjmení")).toBe("Eliška Svobodová")
    expect(valueOf("E-mail")).toBe("eliska@example.test")
    expect(valueOf("Telefon")).toBe("+420601234567")

    const terms = screen.getByText("1. turnus").closest("ul")!
    const [first, second] = within(terms).getAllByRole("listitem")
    expect(first).toHaveTextContent("1. 7. – 7. 7. 2027 · 7 900 Kč")
    expect(first).toHaveTextContent("Potvrzeno")
    expect(second).toHaveTextContent("Náhradník")
  })

  it("separates the selected price, the amount for confirmed terms, payments and the debt", () => {
    renderDetail(MIXED)
    expect(valueOf("Cena vybraných termínů")).toBe("11 800 Kč")
    expect(valueOf("Částka za potvrzené termíny")).toBe("7 900 Kč")
    expect(valueOf("Přijato")).toBe("1 900 Kč")
    expect(valueOf("Dluh")).toBe("6 000 Kč")
    expect(valueOf("Datum připomenutí platby")).toBe("28. 6. 2027")
    expect(valueOf("Variabilní symbol")).toBe("2027094")
    expect(screen.queryByText(/Splatnost/)).not.toBeInTheDocument()

    const payments = screen.getByText("Přijaté platby").closest<HTMLElement>("[data-slot=card]")!
    expect(
      within(payments)
        .getAllByRole("listitem")
        .map((item) => plain(item.textContent)),
    ).toEqual(["12. 10. 2026900 Kč", "14. 10. 20261 000 Kč"])
  })

  it("says settled or overpaid instead of a debt", () => {
    const { unmount } = render(
      <RegistrationDetail
        registration={{ ...MIXED, paidMinor: 790_000, balanceMinor: 0, paymentState: "paid" }}
        updatedAt={UPDATED_AT}
        isRefreshing={false}
        hasRefreshFailed={false}
        onRefresh={vi.fn()}
      />,
    )
    expect(valueOf("Vyrovnáno")).toBe("0 Kč")
    unmount()

    renderDetail({ ...MIXED, paidMinor: 800_000, balanceMinor: -10_000, paymentState: "overpaid" })
    expect(valueOf("Přeplatek")).toBe("100 Kč")
  })

  it("has no reminder date or VS without an obligation, and says so", () => {
    renderDetail({
      ...MIXED,
      terms: [{ ...MIXED.terms[1]! }],
      selectedPriceMinor: 390_000,
      amountDueMinor: 0,
      paidMinor: 0,
      balanceMinor: 0,
      paymentState: "none",
      reminderAt: null,
      variableSymbol: null,
      payments: [],
    })
    expect(screen.getAllByText("Bez platební povinnosti").length).toBeGreaterThan(0)
    expect(screen.queryByText("Datum připomenutí platby")).not.toBeInTheDocument()
    expect(screen.queryByText("Variabilní symbol")).not.toBeInTheDocument()
    expect(screen.queryByText("Dluh")).not.toBeInTheDocument()
    expect(screen.getByText("Zatím nebyla zaznamenána žádná platba.")).toBeInTheDocument()
  })

  it("reloads on Aktualizovat and shows the progress", async () => {
    const { onRefresh } = renderDetail(MIXED)
    expect(screen.getByText(/aktualizováno 20\. 10\. 2026 14:03/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Aktualizovat" }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it("keeps the last data after a failed reload without calling them fresh", async () => {
    const { onRefresh } = renderDetail(MIXED, { hasRefreshFailed: true })
    expect(screen.getByText("Data se nepodařilo načíst. Zkuste to znovu.")).toBeInTheDocument()
    expect(screen.queryByText(/aktualizováno/)).not.toBeInTheDocument()
    expect(valueOf("Dluh")).toBe("6 000 Kč")
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it("disables the reload while it runs", () => {
    renderDetail(MIXED, { isRefreshing: true })
    expect(screen.getByRole("button", { name: "Aktualizuji…" })).toBeDisabled()
  })
})
