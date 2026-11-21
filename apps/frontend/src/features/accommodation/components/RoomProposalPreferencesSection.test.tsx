import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { roomProposalKeys } from "@/features/accommodation/api/roomProposalQueryOptions"
import { RoomProposalPreferencesSection } from "@/features/accommodation/components/RoomProposalPreferencesSection"
import { makeRoomProposalPreferences } from "@/features/accommodation/fixtures/roomProposal"

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
const failure = () => ({
  json: () => Promise.reject(new FakeHTTPError({ status: 500 }, {})),
})
const PATH = "organizations/org/events/event/accommodation/room-proposal-preferences"
const RANKED = makeRoomProposalPreferences("ranked")

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RoomProposalPreferencesSection
        organizationId="org"
        eventId="event"
      />
    </QueryClientProvider>,
  )
  return client
}

const items = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "")

beforeEach(() => {
  get.mockReset()
  put.mockReset()
})

describe("RoomProposalPreferencesSection", () => {
  it("saves the new order and neutral answers and makes the room proposals stale", async () => {
    get.mockReturnValue(answer(RANKED))
    const saved = {
      ...RANKED,
      preferences: [{ id: "roommate-wishes" }, { id: "gender", neutralValues: ["undisclosed"] }],
    }
    put.mockReturnValue(answer(saved))
    const client = renderSection()
    const invalidate = vi.spyOn(client, "invalidateQueries")

    await userEvent.click(await screen.findByRole("button", { name: "Posunout Přání výš" }))
    await userEvent.click(screen.getByRole("checkbox", { name: "Jiná odpověď" }))
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(PATH, { json: { preferences: saved.preferences } }),
    )
    await waitFor(() =>
      expect(client.getQueryData(roomProposalKeys.preferences("org", "event"))).toEqual(saved),
    )
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: roomProposalKeys.terms("org", "event"),
    })
    expect(items()[0]).toMatch(/^1\.Přání/)
  })

  // Adding through the menu is covered by the Settings stories (a real
  // browser): jsdom has no pointer capture for the select.
  it("removes items down to an empty list, which can be saved", async () => {
    get.mockReturnValue(answer(RANKED))
    put.mockReturnValue(answer({ ...RANKED, preferences: [] }))
    renderSection()

    await userEvent.click(await screen.findByRole("button", { name: "Odebrat Pohlaví" }))
    expect(screen.queryByRole("checkbox", { name: "Jiná odpověď" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Odebrat Přání" }))
    expect(screen.getByText(/^Bez měkkých preferencí/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(put).toHaveBeenCalledWith(PATH, { json: { preferences: [] } }))
  })

  it("keeps the unsent list and says which list still applies when saving fails", async () => {
    get.mockReturnValue(answer(RANKED))
    put.mockReturnValue(failure())
    renderSection()

    await userEvent.click(await screen.findByRole("button", { name: "Odebrat Pohlaví" }))
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText("Preference se nepodařilo uložit")).toBeInTheDocument()
    expect(screen.getByText("Platí dál: 1. Pohlaví, 2. Přání.")).toBeInTheDocument()
    // The saved list is read again after the failure; the form keeps its own.
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(items()).toHaveLength(1)
    expect(items()[0]).toMatch(/^1\.Přání/)
  })

  it("asks to remove the hard attribute when it became one meanwhile", async () => {
    get.mockReturnValue(answer(RANKED))
    put.mockReturnValue({
      json: () => Promise.reject(new FakeHTTPError({ status: 409 }, {})),
    })
    renderSection()

    await userEvent.click(await screen.findByRole("button", { name: "Uložit" }))

    expect(
      await screen.findByText(/^Tvrdé pravidlo ubytování nelze přidat mezi měkké preference/),
    ).toBeInTheDocument()
  })

  it("offers a retry when the list cannot be loaded", async () => {
    get.mockReturnValue(failure())
    renderSection()

    expect(
      await screen.findByText("Preference návrhu pokojů se nepodařilo načíst"),
    ).toBeInTheDocument()
  })
})
