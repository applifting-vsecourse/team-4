import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { RoomProposalModeSection } from "@/features/accommodation/components/RoomProposalModeSection"

const { get, put, FakeHTTPError } = vi.hoisted(() => {
  class FakeHTTPError extends Error {
    constructor(
      public response: { status: number },
      public data: unknown,
    ) {
      super("HTTP error")
    }
  }
  return { get: vi.fn(), put: vi.fn(), FakeHTTPError }
})

vi.mock("@/lib/api-client", () => ({ api: { get, put }, HTTPError: FakeHTTPError }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const answer = (value: unknown) => ({ json: () => Promise.resolve(value) })

function renderSection() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RoomProposalModeSection
        organizationId="org"
        eventId="event"
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  get.mockReset()
  put.mockReset()
})

describe("RoomProposalModeSection", () => {
  it("starts on the saved mode and saves the chosen one", async () => {
    get.mockReturnValue(answer({ mode: "manual" }))
    put.mockReturnValue(answer({ mode: "automatic" }))
    renderSection()

    expect(
      await screen.findByRole("radio", { name: "Navrhnout pokoje jen tlačítkem Navrhnout pokoje" }),
    ).toBeChecked()
    await userEvent.click(
      screen.getByRole("radio", { name: "Navrhnout pokoje automaticky po každé změně" }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(
        "organizations/org/events/event/accommodation/room-proposal-mode",
        { json: { mode: "automatic" } },
      ),
    )
  })

  it("says which mode still applies when saving fails", async () => {
    get.mockReturnValue(answer({ mode: "manual" }))
    put.mockReturnValue({ json: () => Promise.reject(new FakeHTTPError({ status: 500 }, {})) })
    renderSection()

    await userEvent.click(
      await screen.findByRole("radio", { name: "Navrhnout pokoje automaticky po každé změně" }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText("Režim návrhu pokojů se nepodařilo uložit")).toBeInTheDocument()
    expect(
      screen.getByText("Pokoje se dál navrhují jen tlačítkem Navrhnout pokoje."),
    ).toBeInTheDocument()
  })
})
