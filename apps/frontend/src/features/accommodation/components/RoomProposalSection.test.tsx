import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RoomProposalSection } from "@/features/accommodation/components/RoomProposalSection"
import { EVALUATED_TERM } from "@/features/accommodation/fixtures/evaluation"
import { makeTermRoomProposal } from "@/features/accommodation/fixtures/roomProposal"

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

const answer = (value: unknown) => ({ json: () => Promise.resolve(value) })
const refuse = (status: number) => ({
  json: () => Promise.reject(new FakeHTTPError({ status }, {})),
})

function renderSection(terms = [EVALUATED_TERM]) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RoomProposalSection
        organizationId="org"
        eventId="event"
        terms={terms}
        termId={terms[0]?.id ?? ""}
        onSelectTerm={() => undefined}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

describe("RoomProposalSection", () => {
  it("shows the rooms of the proposal and who has no room, with the reason", async () => {
    get.mockReturnValue(answer(makeTermRoomProposal("current")))
    renderSection()

    const buk = (await screen.findByRole("cell", { name: "Chata Buk" })).closest("tr")!
    expect(within(buk).getByText("Jan Dvořák")).toBeInTheDocument()
    expect(within(buk).getByText("3 / 3")).toBeInTheDocument()
    const unplaced = screen.getByRole("region", { name: "Bez pokoje v návrhu" })
    expect(within(unplaced).getByText("Tomáš Král")).toBeInTheDocument()
    expect(screen.getByText("Aktuální návrh")).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith(
      `organizations/org/events/event/accommodation/terms/${EVALUATED_TERM.id}/room-proposal`,
    )
  })

  it("queues a proposal and reads as running", async () => {
    get.mockReturnValue(answer(makeTermRoomProposal("none")))
    post.mockReturnValue(answer(makeTermRoomProposal("running")))
    renderSection()

    expect(await screen.findByText("Termín zatím nemá návrh pokojů")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Navrhnout pokoje" }))

    expect(await screen.findByRole("button", { name: "Navrhuje se…" })).toBeDisabled()
    expect(post).toHaveBeenCalledWith(
      `organizations/org/events/event/accommodation/terms/${EVALUATED_TERM.id}/room-proposal`,
    )
  })

  it("keeps the last finished proposal after a failed one and offers a retry", async () => {
    get.mockReturnValue(answer(makeTermRoomProposal("failed")))
    renderSection()

    expect(await screen.findByText("Návrh pokojů se nezdařil")).toBeInTheDocument()
    expect(screen.getByText("Níže je poslední dokončený návrh.")).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Chata Buk" })).toBeInTheDocument()
  })

  it("says when proposing could not start, and keeps the shown proposal", async () => {
    get.mockReturnValue(answer(makeTermRoomProposal("current")))
    post.mockReturnValue(refuse(500))
    renderSection()

    await userEvent.click(await screen.findByRole("button", { name: "Navrhnout pokoje" }))

    expect(await screen.findByText("Návrh pokojů se nepodařilo spustit")).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Chata Buk" })).toBeInTheDocument()
  })

  it("shows an empty state without confirmed participants", async () => {
    get.mockReturnValue(answer(makeTermRoomProposal("empty")))
    renderSection()

    expect(
      await screen.findByText("V termínu zatím nejsou potvrzení účastníci"),
    ).toBeInTheDocument()
  })

  it("offers a reload when the term cannot be read", async () => {
    get.mockReturnValueOnce(refuse(500)).mockReturnValue(answer(makeTermRoomProposal("current")))
    renderSection()

    await userEvent.click(await screen.findByRole("button", { name: /Zkusit znovu/ }))

    await waitFor(() => expect(screen.getByRole("cell", { name: "Chata Buk" })).toBeInTheDocument())
  })

  it("shows an empty state for an event without terms", () => {
    renderSection([])
    expect(screen.getByText("Akce zatím nemá žádný termín")).toBeInTheDocument()
  })
})
