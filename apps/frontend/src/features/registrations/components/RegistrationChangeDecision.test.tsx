import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RegistrationChangeDecision } from "@/features/registrations/components/RegistrationChangeDecision"

const { get, post, FakeHTTPError } = vi.hoisted(() => {
  class FakeHTTPError extends Error {
    constructor(
      public response: { status: number },
      public data: unknown,
    ) {
      super("HTTP error")
    }
  }
  return { get: vi.fn(), post: vi.fn(), FakeHTTPError }
})

vi.mock("@/lib/api-client", () => ({ api: { get, post }, HTTPError: FakeHTTPError }))

const id = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

const change = (overrides: Record<string, unknown> = {}) => ({
  id: id(900),
  registrationId: id(1),
  status: "pending",
  kinds: ["move"],
  createdAt: "2026-10-30T13:05:00.000Z",
  decidedAt: null,
  isStale: false,
  participant: { firstName: "Jana", lastName: "Nováková", email: "jana@example.com" },
  summary: {
    values: [],
    needs: null,
    terms: [
      {
        termId: id(101),
        label: "Turnus 1",
        startDate: "2026-11-06",
        endDate: "2026-11-08",
        priceMinor: 240_000,
        original: "confirmed",
        proposed: "cancelled",
      },
      {
        termId: id(103),
        label: "Turnus 3",
        startDate: "2026-12-04",
        endDate: "2026-12-06",
        priceMinor: 290_000,
        original: null,
        proposed: "confirmed",
      },
    ],
    original: { dueMinor: 480_000, paidMinor: 480_000, balanceMinor: 0 },
    proposed: { dueMinor: 530_000, paidMinor: 480_000, balanceMinor: 50_000 },
  },
  ...overrides,
})

const answer = (value: unknown) => ({ json: () => Promise.resolve(value) })

function renderDecision() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RegistrationChangeDecision
        organizationId="org"
        eventId="event"
        registrationId={id(1)}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

describe("RegistrationChangeDecision", () => {
  it("shows the original and proposed values of a waiting request and approves it", async () => {
    get.mockReturnValue(answer({ changes: [change()] }))
    post.mockReturnValue(
      answer(change({ status: "approved", decidedAt: "2026-10-31T08:12:00.000Z" })),
    )
    renderDecision()

    expect(await screen.findByText("Čeká na schválení")).toBeInTheDocument()
    expect(screen.getAllByText("Turnus 3").length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole("button", { name: "Schválit" }))

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        `organizations/org/events/event/registrations/${id(1)}/changes/${id(900)}/approve`,
      ),
    )
  })

  it("explains that a move without consent to give up a confirmed place can only be rejected", async () => {
    get.mockReturnValue(answer({ changes: [change()] }))
    post.mockReturnValue({
      json: () =>
        Promise.reject(new FakeHTTPError({ status: 409 }, { code: "release_consent_required" })),
    })
    renderDecision()

    await userEvent.click(await screen.findByRole("button", { name: "Schválit" }))

    expect(await screen.findByText(/Žádost lze jen zamítnout/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Schválit" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Zamítnout" })).toBeEnabled()
  })

  it("rejects a request", async () => {
    get.mockReturnValue(answer({ changes: [change()] }))
    post.mockReturnValue(
      answer(change({ status: "rejected", decidedAt: "2026-10-31T08:12:00.000Z" })),
    )
    renderDecision()

    await userEvent.click(await screen.findByRole("button", { name: "Zamítnout" }))
    await waitFor(() => expect(post).toHaveBeenCalledWith(expect.stringMatching(/\/reject$/)))
  })

  it("cannot approve a request made on an older version of the registration, only reject it", async () => {
    get.mockReturnValue(answer({ changes: [change({ isStale: true })] }))
    renderDecision()

    expect(await screen.findByText(/žádost proto nelze schválit/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Schválit" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Zamítnout" })).toBeEnabled()
  })

  it("shows a failed decision with a retry and leaves the request pending", async () => {
    get.mockReturnValue(answer({ changes: [change()] }))
    post.mockReturnValue({
      json: () => Promise.reject(new FakeHTTPError({ status: 500 }, {})),
    })
    renderDecision()

    await userEvent.click(await screen.findByRole("button", { name: "Schválit" }))
    expect(
      await screen.findByText("Rozhodnutí se nepodařilo uložit. Zkuste to prosím znovu."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Schválit" })).toBeEnabled()
  })

  it("keeps a rejected request visible without decision buttons", async () => {
    get.mockReturnValue(
      answer({ changes: [change({ status: "rejected", decidedAt: "2026-10-31T08:12:00.000Z" })] }),
    )
    renderDecision()

    expect((await screen.findAllByText("Zamítnuto")).length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: "Schválit" })).not.toBeInTheDocument()
  })

  it("shows nothing about changes for a registration without any", async () => {
    get.mockReturnValue(answer({ changes: [] }))
    renderDecision()
    await waitFor(() => expect(get).toHaveBeenCalled())
    expect(screen.queryByText("Žádost o změnu")).not.toBeInTheDocument()
    expect(screen.queryByText("Historie změn")).not.toBeInTheDocument()
  })
})
