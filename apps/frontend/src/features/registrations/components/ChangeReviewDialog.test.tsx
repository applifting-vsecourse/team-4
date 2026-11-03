import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { type ChangePreview } from "@/features/registrations/api/registrationChangeSchemas"
import { ChangeReviewDialog } from "@/features/registrations/components/ChangeReviewDialog"

const { post, FakeHTTPError } = vi.hoisted(() => {
  class FakeHTTPError extends Error {
    constructor(
      public response: { status: number },
      public data: unknown,
    ) {
      super("HTTP error")
    }
  }
  return { post: vi.fn(), FakeHTTPError }
})

vi.mock("@/lib/api-client", () => ({ api: { post }, HTTPError: FakeHTTPError }))

const id = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`
const [REGISTRATION, T2, T3, CHANGE] = [id(1), id(102), id(103), id(900)]

const money = (dueMinor: number) => ({
  dueMinor,
  paidMinor: 480_000,
  balanceMinor: dueMinor - 480_000,
})

const preview = (overrides: Partial<ChangePreview> = {}): ChangePreview => ({
  version: 3,
  requiresApproval: false,
  kinds: ["move"],
  moves: [
    { fromTermId: T2, toTermId: T3, resultStatus: "confirmed", requiresWaitlistConsent: false },
  ],
  summary: {
    values: [],
    terms: [
      {
        termId: T2,
        label: "Turnus 2",
        startDate: "2026-11-20",
        endDate: "2026-11-22",
        priceMinor: 240_000,
        original: "confirmed",
        proposed: "cancelled",
      },
      {
        termId: T3,
        label: "Turnus 3",
        startDate: "2026-12-04",
        endDate: "2026-12-06",
        priceMinor: 290_000,
        original: null,
        proposed: "confirmed",
      },
    ],
    original: money(480_000),
    proposed: money(530_000),
  },
  ...overrides,
})

const answer = (value: unknown) => ({ json: () => Promise.resolve(value) })
const refuse = (status: number, data: unknown) => ({
  json: () => Promise.reject(new FakeHTTPError({ status }, data)),
})

const PROPOSAL = {
  moves: [{ fromTermId: T2, toTermId: T3, acceptWaitlist: false }],
  cancelledTermIds: [],
}

const CHANGE_RESULT = {
  id: CHANGE,
  registrationId: REGISTRATION,
  status: "applied",
  kinds: ["move"],
  createdAt: "2026-11-02T10:00:00.000Z",
  decidedAt: "2026-11-02T10:00:00.000Z",
  summary: preview().summary,
  needsParticipantConsent: false,
  isStale: false,
  participant: { firstName: "Jana", lastName: "Nováková", email: "jana@example.com" },
}

/** The preview call first, then whatever the test queues for the submit. */
const serve = (...submits: unknown[]) => {
  const queue = [...submits]
  post.mockImplementation((path: string) =>
    path.endsWith("/preview") ? answer(preview()) : (queue.shift() ?? answer(null)),
  )
}

const onClose = vi.fn()
const onDone = vi.fn()
const onReload = vi.fn()

function renderReview(proposal = PROPOSAL) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChangeReviewDialog
        registrationId={REGISTRATION}
        proposal={proposal}
        onClose={onClose}
        onDone={onDone}
        onReload={onReload}
      />
    </QueryClientProvider>,
  )
}

const submitted = () => post.mock.calls.find(([path]) => !String(path).endsWith("/preview"))

beforeEach(() => {
  post.mockReset()
  onClose.mockReset()
  onDone.mockReset()
  onReload.mockReset()
})

describe("ChangeReviewDialog", () => {
  it("shows the server's review and sends what was confirmed with its version", async () => {
    serve(answer({ outcome: "applied", change: CHANGE_RESULT }))
    renderReview()

    const confirm = await screen.findByRole("button", { name: "Potvrdit změnu" })
    expect(screen.getByText("Turnus 3")).toBeInTheDocument()
    expect(
      screen.getByText(/Storno poplatek a případnou vratku řeší organizátor/),
    ).toBeInTheDocument()
    await userEvent.click(confirm)

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(submitted()![1]).toEqual({
      json: { ...PROPOSAL, expectedVersion: 3, expectsApproval: false },
    })
  })

  it("offers a request instead of a change when the organizer must approve", async () => {
    post.mockImplementation((path: string) =>
      path.endsWith("/preview") ? answer(preview({ requiresApproval: true })) : answer(null),
    )
    renderReview()
    expect(
      await screen.findByRole("button", { name: "Odeslat žádost o schválení" }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Změnu musí schválit organizátor/)).toBeInTheDocument()
  })

  it("shows a failed submit with the way to retry, and nothing as done", async () => {
    serve(refuse(500, {}), answer({ outcome: "applied", change: CHANGE_RESULT }))
    renderReview()
    await userEvent.click(await screen.findByRole("button", { name: "Potvrdit změnu" }))

    expect(
      await screen.findByText("Změnu se nepodařilo odeslat. Zkuste to prosím znovu."),
    ).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Potvrdit změnu" }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it("asks for a reload instead of sending a stale proposal again", async () => {
    serve(refuse(409, { code: "registration_stale", message: "Přihláška se mezitím změnila." }))
    renderReview()
    await userEvent.click(await screen.findByRole("button", { name: "Potvrdit změnu" }))

    await userEvent.click(await screen.findByRole("button", { name: "Načíst přihlášku znovu" }))
    expect(onReload).toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
  })

  it("requires a new confirmation when approval became necessary meanwhile", async () => {
    serve(
      refuse(409, {
        code: "approval_changed",
        preview: preview({ requiresApproval: true }),
      }),
    )
    renderReview()
    await userEvent.click(await screen.findByRole("button", { name: "Potvrdit změnu" }))

    expect(await screen.findByText(/Mezitím začalo platit schvalování změn/)).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Odeslat žádost o schválení" })).toBeInTheDocument()
  })

  it("needs consent to the waitlist when the result changed, and sends it", async () => {
    const waitlisted = preview({
      moves: [
        { fromTermId: T2, toTermId: T3, resultStatus: "waitlisted", requiresWaitlistConsent: true },
      ],
    })
    serve(
      refuse(409, { code: "waitlist_consent_required", preview: waitlisted }),
      answer({ outcome: "applied", change: CHANGE_RESULT }),
    )
    renderReview()
    await userEvent.click(await screen.findByRole("button", { name: "Potvrdit změnu" }))

    expect(await screen.findByText(/se mezitím zaplnil/)).toBeInTheDocument()
    const confirm = screen.getByRole("button", { name: "Potvrdit změnu" })
    expect(confirm).toBeDisabled()
    await userEvent.click(screen.getByRole("checkbox", { name: /Souhlasím/ }))
    await userEvent.click(confirm)

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    const body = post.mock.lastCall?.[1] as { json: { moves: { acceptWaitlist: boolean }[] } }
    expect(body.json.moves[0]?.acceptWaitlist).toBe(true)
  })

  it("lets the participant go back when the review cannot be loaded", async () => {
    post.mockImplementation(() => refuse(500, {}))
    renderReview()
    expect(
      await screen.findByText("Kontrolu změn se nepodařilo načíst. Zkuste to prosím znovu."),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zpět k úpravám" }))
    expect(onClose).toHaveBeenCalled()
  })
})
