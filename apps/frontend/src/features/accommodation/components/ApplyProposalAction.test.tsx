import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApplyProposalAction } from "@/features/accommodation/components/ApplyProposalAction"
import { makeTermRoomProposal } from "@/features/accommodation/fixtures/roomProposal"
import { toProposalLayout } from "@/features/accommodation/lib/roomProposalView"

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
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const PATH = "organizations/org/events/event/accommodation/terms/term/room-proposal/apply"
const APPLIED = { added: 2, moved: 1, removed: 1, layoutVersion: 5 }
const answer = (value: unknown) => ({ json: () => Promise.resolve(value) })
const failure = (status: number, data: unknown = {}) => ({
  json: () => Promise.reject(new FakeHTTPError({ status }, data)),
})
const layoutOf = (preset: Parameters<typeof makeTermRoomProposal>[0]) =>
  toProposalLayout(makeTermRoomProposal(preset).lastSolved!.layout!)

function renderAction(preset: Parameters<typeof makeTermRoomProposal>[0] = "withSaved") {
  const onPropose = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, "invalidateQueries")
  render(
    <QueryClientProvider client={client}>
      <ApplyProposalAction
        organizationId="org"
        eventId="event"
        termId="term"
        term="Turnus 1, 4.–17. 7. 2027"
        proposalId="proposal-1"
        layout={layoutOf(preset)}
        onPropose={onPropose}
      />
    </QueryClientProvider>,
  )
  return { onPropose, invalidate }
}

const keyOf = (call: number) =>
  (post.mock.calls[call]![1] as { json: { submissionKey: string } }).json.submissionKey

/** "Použít návrh" inside the dialog, not the one that opens it. */
const applyInDialog = () =>
  within(screen.getByRole("dialog")).getByRole("button", { name: "Použít návrh" })

beforeEach(() => post.mockReset())

describe("ApplyProposalAction", () => {
  it("applies the reviewed proposal once and reloads the term", async () => {
    post.mockReturnValue(answer(APPLIED))
    const { invalidate } = renderAction()

    await userEvent.click(screen.getByRole("button", { name: "Použít návrh" }))
    expect(screen.getByText("Jan Dvořák: Chata Dub → Chata Buk")).toBeInTheDocument()
    await userEvent.click(applyInDialog())

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(PATH, {
        json: { proposalId: "proposal-1", submissionKey: expect.any(String) as unknown },
      }),
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(invalidate).toHaveBeenCalled()
  })

  it("keeps the key for a retry after a failure and renews it for a new attempt", async () => {
    post.mockReturnValueOnce(failure(500)).mockReturnValueOnce(failure(500))
    renderAction()

    await userEvent.click(screen.getByRole("button", { name: "Použít návrh" }))
    await userEvent.click(applyInDialog())
    expect(await screen.findByText("Návrh se nepodařilo použít")).toBeInTheDocument()
    await userEvent.click(applyInDialog())
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
    expect(keyOf(1)).toBe(keyOf(0))

    await userEvent.click(screen.getByRole("button", { name: "Zrušit" }))
    post.mockReturnValueOnce(answer(APPLIED))
    await userEvent.click(screen.getByRole("button", { name: "Použít návrh" }))
    expect(screen.queryByText("Návrh se nepodařilo použít")).not.toBeInTheDocument()
    await userEvent.click(applyInDialog())
    await waitFor(() => expect(post).toHaveBeenCalledTimes(3))
    expect(keyOf(2)).not.toBe(keyOf(0))
  })

  it("explains a stale proposal and offers a new one", async () => {
    post.mockReturnValue(failure(409, { code: "proposal_stale" }))
    const { onPropose } = renderAction()

    await userEvent.click(screen.getByRole("button", { name: "Použít návrh" }))
    await userEvent.click(applyInDialog())

    expect(
      await screen.findByText("Návrh pokojů je neaktuální, nic se neuložilo"),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Navrhnout pokoje" }))
    expect(onPropose).toHaveBeenCalled()
  })

  it("shows no button when nothing would change", () => {
    renderAction("empty")

    expect(screen.queryByRole("button", { name: "Použít návrh" })).not.toBeInTheDocument()
  })
})
