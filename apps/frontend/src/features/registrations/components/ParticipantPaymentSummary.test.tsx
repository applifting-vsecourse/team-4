import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ParticipantPaymentSummary } from "@/features/registrations/components/ParticipantPaymentSummary"

type Props = Parameters<typeof ParticipantPaymentSummary>[0]

const show = (props: Partial<Props>) =>
  render(
    <ParticipantPaymentSummary
      terms={[{ status: "confirmed" }]}
      selectedPriceMinor={450_000}
      amountDueMinor={450_000}
      paidMinor={0}
      instructions={null}
      {...props}
    />,
  )

describe("ParticipantPaymentSummary (S5-02)", () => {
  it("calls the price of unconfirmed terms preliminary and asks for no payment", () => {
    show({ terms: [{ status: "pending" }], amountDueMinor: 0 })

    expect(screen.getByText("Předběžná cena vybraných termínů")).toBeInTheDocument()
    expect(screen.getByText(/Zatím nic neplaťte/)).toBeInTheDocument()
    expect(screen.queryByText("Zbývá zaplatit")).not.toBeInTheDocument()
  })

  it("counts only confirmed terms once one is confirmed", () => {
    show({
      terms: [{ status: "confirmed" }, { status: "waitlisted" }],
      selectedPriceMinor: 900_000,
      paidMinor: 200_000,
    })

    expect(screen.getByText("Cena potvrzených termínů")).toBeInTheDocument()
    expect(screen.getByText(/4\s500\sKč/)).toBeInTheDocument()
    expect(screen.getByText("Zbývá zaplatit")).toBeInTheDocument()
    expect(screen.getByText(/2\s500\sKč/)).toBeInTheDocument()
    expect(screen.queryByText(/9\s000/)).not.toBeInTheDocument()
  })

  it("says settled and names an overpayment without asking for another payment", () => {
    const { unmount } = show({ paidMinor: 450_000 })
    expect(screen.getByText("Zaplaceno")).toBeInTheDocument()
    unmount()

    show({ paidMinor: 500_000 })
    expect(screen.getByText("Přeplatek")).toBeInTheDocument()
    expect(screen.queryByText("Zbývá zaplatit")).not.toBeInTheDocument()
    expect(screen.getByText(/Další platba není potřeba/)).toBeInTheDocument()
  })

  it("tells a free confirmed participation from a free one still waiting", () => {
    const { unmount } = show({
      selectedPriceMinor: 0,
      amountDueMinor: 0,
      terms: [{ status: "confirmed" }],
    })
    expect(screen.getByText("Potvrzená účast je zdarma, nic neplatíte.")).toBeInTheDocument()
    unmount()

    show({ selectedPriceMinor: 0, amountDueMinor: 0, terms: [{ status: "pending" }] })
    expect(screen.getByText(/po potvrzení nic neplatíte/)).toBeInTheDocument()
  })

  it("says the participation is cancelled, with any overpayment and no preliminary price", () => {
    show({
      terms: [{ status: "cancelled" }],
      selectedPriceMinor: 0,
      amountDueMinor: 0,
      paidMinor: 200_000,
    })

    expect(screen.getByText("Účast zrušena")).toBeInTheDocument()
    expect(screen.getByText("Přeplatek")).toBeInTheDocument()
    expect(screen.queryByText(/Předběžná cena/)).not.toBeInTheDocument()
    expect(screen.queryByText("Zbývá zaplatit")).not.toBeInTheDocument()
  })
})
