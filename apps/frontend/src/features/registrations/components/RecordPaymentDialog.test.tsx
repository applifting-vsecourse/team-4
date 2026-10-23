import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { formatCzk } from "@/lib/money"

import { RecordPaymentDialog } from "@/features/registrations/components/RecordPaymentDialog"

type Body = { submissionKey: string; amountMinor: number; receivedOn: string }

const { post, toastSuccess, FakeHttpError } = vi.hoisted(() => {
  class FakeHttpError extends Error {
    response: { status: number }
    data: unknown
    constructor(status: number, data: unknown) {
      super("http")
      this.response = { status }
      this.data = data
    }
  }
  return {
    post: vi.fn<(path: string, options: { json: Body }) => unknown>(),
    toastSuccess: vi.fn(),
    FakeHttpError,
  }
})

vi.mock("@/lib/api-client", () => ({ api: { post }, HTTPError: FakeHttpError }))
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }))

const DETAIL = {
  id: "0190c0de-0000-7000-8000-0000000000a1",
  receivedAt: "2026-10-10T07:31:05.000Z",
  firstName: "Eliška",
  lastName: "Svobodová",
  email: "eliska@example.test",
  phone: "+420601234567",
  terms: [],
  selectedPriceMinor: 100_000,
  amountDueMinor: 100_000,
  paidMinor: 60_000,
  balanceMinor: 40_000,
  paymentState: "partial",
  reminderAt: null,
  variableSymbol: null,
  payments: [
    { id: "0190c0de-0000-7000-8000-0000000000b1", receivedOn: "2026-10-12", amountMinor: 60_000 },
  ],
}

const answer = (value: unknown) => ({ json: () => Promise.resolve(value) })

async function openDialog() {
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RecordPaymentDialog
        organizationId="org"
        eventId="event"
        registrationId="reg"
      />
    </QueryClientProvider>,
  )
  await user.click(screen.getByRole("button", { name: "Zaznamenat platbu" }))
  return user
}

const sentBody = (call = 0): Body => post.mock.calls[call]![1].json

beforeEach(() => {
  post.mockReset()
  toastSuccess.mockReset()
})

describe("RecordPaymentDialog", () => {
  it("sends the amount in haléře and confirms the saved payment", async () => {
    post.mockReturnValue(answer(DETAIL))
    const user = await openDialog()

    await user.type(screen.getByLabelText("Přijatá částka (Kč)"), "600,50")
    await user.click(screen.getByRole("button", { name: "Uložit platbu" }))

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(`Platba ${formatCzk(60_050)} zaznamenána`),
    )
    expect(post.mock.calls[0]![0]).toBe("organizations/org/events/event/registrations/reg/payments")
    expect(sentBody().amountMinor).toBe(60_050)
    expect(sentBody().submissionKey).toEqual(expect.any(String))
    expect(sentBody().receivedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it.each([
    ["", "Zadejte částku."],
    ["0", "Částka musí být větší než nula."],
    ["12,345", "Částka může mít nejvýše dvě desetinná místa."],
  ])("sends nothing for the amount %j", async (typed, message) => {
    const user = await openDialog()
    if (typed) await user.type(screen.getByLabelText("Přijatá částka (Kč)"), typed)
    await user.click(screen.getByRole("button", { name: "Uložit platbu" }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("keeps the dialog and values after a failed save and retries with the same key", async () => {
    post.mockImplementationOnce(() => {
      throw new FakeHttpError(500, {})
    })
    post.mockReturnValueOnce(answer(DETAIL))
    const user = await openDialog()

    await user.type(screen.getByLabelText("Přijatá částka (Kč)"), "600")
    await user.click(screen.getByRole("button", { name: "Uložit platbu" }))

    expect(await screen.findByText(/Platbu se nepodařilo uložit/)).toBeInTheDocument()
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Přijatá částka (Kč)")).toHaveValue("600")

    await user.click(screen.getByRole("button", { name: "Uložit platbu" }))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    expect(sentBody(1).submissionKey).toBe(sentBody(0).submissionKey)
  })

  it("uses a new key when the values changed after a failure", async () => {
    post.mockImplementationOnce(() => {
      throw new FakeHttpError(500, {})
    })
    post.mockReturnValueOnce(answer(DETAIL))
    const user = await openDialog()

    const amount = screen.getByLabelText("Přijatá částka (Kč)")
    await user.type(amount, "600")
    await user.click(screen.getByRole("button", { name: "Uložit platbu" }))
    await screen.findByText(/Platbu se nepodařilo uložit/)
    await user.clear(amount)
    await user.type(amount, "700")
    await user.click(screen.getByRole("button", { name: "Uložit platbu" }))

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    expect(sentBody(1).submissionKey).not.toBe(sentBody(0).submissionKey)
  })

  it("shows a date refused by the server at the date field", async () => {
    post.mockImplementationOnce(() => {
      throw new FakeHttpError(400, {
        code: "received_on_future",
        field: "receivedOn",
        message: "Datum přijetí nesmí být v budoucnosti.",
      })
    })
    const user = await openDialog()

    await user.type(screen.getByLabelText("Přijatá částka (Kč)"), "600")
    await user.click(screen.getByRole("button", { name: "Uložit platbu" }))

    expect(await screen.findByText("Datum přijetí nesmí být v budoucnosti.")).toBeInTheDocument()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("records one payment for a double click", async () => {
    let finish: (value: unknown) => void = vi.fn()
    post.mockReturnValue({ json: () => new Promise((resolve) => (finish = resolve)) })
    const user = await openDialog()

    await user.type(screen.getByLabelText("Přijatá částka (Kč)"), "600")
    await user.dblClick(screen.getByRole("button", { name: "Uložit platbu" }))
    finish(DETAIL)

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1))
    expect(post).toHaveBeenCalledTimes(1)
  })
})
