import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { QrPayment } from "@/features/registrations/components/QrPayment"

type Body = { submissionKey: string; amountMinor: number }

const { get, post, FakeHttpError } = vi.hoisted(() => {
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
    get: vi.fn(),
    post: vi.fn<(path: string, options: { json: Body }) => unknown>(),
    FakeHttpError,
  }
})

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params }: { children: React.ReactNode; to: string; params: object }) => (
    <a href={to.replace("$registrationId", (params as { registrationId: string }).registrationId)}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/api-client", () => ({ api: { get, post }, HTTPError: FakeHttpError }))

const TOKEN = "c".repeat(64)
const answer = (body: unknown) => ({ json: () => Promise.resolve(body) })
const fail = (status: number, data: unknown = {}) => ({
  json: () => Promise.reject(new FakeHttpError(status, data)),
})
const plain = (text: string | null | undefined) => text?.replace(/\u00a0/g, " ")

const REGISTRATION_ID = "0190c0de-0000-7000-8000-0000000000a1"
const DEBT = { registrationId: REGISTRATION_ID, eventName: "Letní tábor", balanceMinor: 240_000 }

function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QrPayment token={TOKEN} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

describe("QrPayment", () => {
  it("opens with the debt prefilled and records nothing", async () => {
    get.mockReturnValue(answer(DEBT))
    renderPage()

    expect(await screen.findByLabelText("Částka (Kč)")).toHaveValue("2400")
    expect(plain(screen.getByText("Zbývá zaplatit").nextElementSibling?.textContent)).toBe(
      "2 400 Kč",
    )
    expect(get).toHaveBeenCalledWith(`public/payments/${TOKEN}`)
    expect(get).toHaveBeenCalledTimes(1)
    expect(post).not.toHaveBeenCalled()
  })

  it("leads back to the registration detail", async () => {
    get.mockReturnValue(answer(DEBT))
    renderPage()

    expect(await screen.findByRole("link", { name: "Zpět na přihlášku" })).toHaveAttribute(
      "href",
      `/my-registrations/${REGISTRATION_ID}`,
    )
  })

  it("pays a part and shows the new debt", async () => {
    get
      .mockReturnValueOnce(answer(DEBT))
      .mockReturnValue(answer({ ...DEBT, balanceMinor: 140_000 }))
    post.mockReturnValue(answer({ paidMinor: 100_000, balanceMinor: 140_000 }))
    renderPage()

    const amount = await screen.findByLabelText("Částka (Kč)")
    await userEvent.clear(amount)
    await userEvent.type(amount, "1000")
    await userEvent.click(screen.getByRole("button", { name: "Zaplatit" }))

    expect(await screen.findByText("Platba byla přijata")).toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0]![0]).toBe(`public/payments/${TOKEN}`)
    expect(post.mock.calls[0]![1].json).toMatchObject({ amountMinor: 100_000 })
    expect(screen.getByRole("button", { name: "Zaplatit další část" })).toBeInTheDocument()
  })

  it("explains an invalid amount, keeps the input and sends nothing", async () => {
    get.mockReturnValue(answer(DEBT))
    renderPage()

    const amount = await screen.findByLabelText("Částka (Kč)")
    await userEvent.clear(amount)
    await userEvent.type(amount, "12,345")
    await userEvent.click(screen.getByRole("button", { name: "Zaplatit" }))

    expect(await screen.findByText(/nejvýše dvě desetinná místa/)).toBeInTheDocument()
    expect(amount).toHaveValue("12,345")
    expect(post).not.toHaveBeenCalled()
  })

  it("refuses an amount above the debt", async () => {
    get.mockReturnValue(answer(DEBT))
    renderPage()

    const amount = await screen.findByLabelText("Částka (Kč)")
    await userEvent.clear(amount)
    await userEvent.type(amount, "2500")
    await userEvent.click(screen.getByRole("button", { name: "Zaplatit" }))

    expect(await screen.findByText(/vyšší než zbývá zaplatit/)).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it("asks again when the debt dropped meanwhile, keeping the amount", async () => {
    get.mockReturnValueOnce(answer(DEBT)).mockReturnValue(answer({ ...DEBT, balanceMinor: 90_000 }))
    post.mockReturnValue(fail(409, { code: "debt_reduced", balanceMinor: 90_000 }))
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Zaplatit" }))

    expect(await screen.findByText("Částka k úhradě se mezitím snížila")).toBeInTheDocument()
    expect(screen.getByLabelText("Částka (Kč)")).toHaveValue("2400")
    expect(await screen.findByText(/vyšší než zbývá zaplatit \(900 Kč\)/)).toBeInTheDocument()
  })

  it("repeats the same key when a failed save is retried, so it cannot pay twice", async () => {
    get.mockReturnValue(answer(DEBT))
    post
      .mockReturnValueOnce(fail(500))
      .mockReturnValueOnce(answer({ paidMinor: 240_000, balanceMinor: 0 }))
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Zaplatit" }))
    expect(await screen.findByText(/Platbu se nepodařilo dokončit/)).toBeInTheDocument()
    expect(screen.queryByText("Platba byla přijata")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Částka (Kč)")).toHaveValue("2400")

    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByText("Platba byla přijata")).toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(2)
    expect(post.mock.calls[1]![1].json.submissionKey).toBe(
      post.mock.calls[0]![1].json.submissionKey,
    )
  })

  it("offers no payment when nothing is owed", async () => {
    get.mockReturnValue(answer({ ...DEBT, balanceMinor: 0 }))
    renderPage()

    expect(await screen.findByText("Přihláška je uhrazená")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Zaplatit" })).not.toBeInTheDocument()
  })

  it("shows an unavailable payment for an invalid link, without data", async () => {
    get.mockReturnValue(fail(404, { code: "payment_unavailable" }))
    renderPage()

    expect(await screen.findByText("Záznam není dostupný")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Zpět na přihlášku" })).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Částka (Kč)")).not.toBeInTheDocument()
  })

  it("offers a retry when the debt could not be loaded", async () => {
    get.mockReturnValueOnce(fail(500)).mockReturnValue(answer(DEBT))
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Zkusit znovu" }))
    await waitFor(() => expect(screen.getByLabelText("Částka (Kč)")).toHaveValue("2400"))
  })
})
