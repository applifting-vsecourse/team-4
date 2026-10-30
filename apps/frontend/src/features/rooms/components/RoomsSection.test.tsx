import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { HTTPError } from "@/lib/api-client"

import { roomsOverviewSchema, type RoomsOverview } from "@/features/rooms/api/roomSchemas"
import { RoomsSection } from "@/features/rooms/components/RoomsSection"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

const requests = vi.hoisted(() => ({ put: vi.fn(), post: vi.fn(), delete: vi.fn() }))

vi.mock("@/lib/api-client", () => ({
  api: requests,
  HTTPError: class HTTPError extends Error {
    data: unknown
    response: { status: number }
    constructor(status: number, data: unknown) {
      super("http")
      this.response = { status }
      this.data = data
    }
  },
}))

const T1 = "0190c0de-0000-7000-8000-000000000011"
const T2 = "0190c0de-0000-7000-8000-000000000012"
const ROOM = "0190c0de-0000-7000-8000-000000000401"

const term = (
  id: string,
  label: string,
  baseBeds: number,
  extraBeds: number,
  confirmed: number,
) => ({
  id,
  label,
  startDate: "2027-07-01",
  endDate: "2027-07-07",
  baseBeds,
  extraBeds,
  capacity: baseBeds + extraBeds,
  confirmed,
  free: baseBeds + extraBeds - confirmed,
  waitlisted: 0,
})

const overview: RoomsOverview = {
  terms: [term(T1, "Turnus 1", 4, 1, 5), term(T2, "Turnus 2", 0, 0, 0)],
  rooms: [
    {
      id: ROOM,
      label: "Chatka",
      terms: [
        { termId: T1, isAvailable: true, baseBeds: 4, extraBeds: 1 },
        { termId: T2, isAvailable: false, baseBeds: 6, extraBeds: 2 },
      ],
    },
  ],
}

const rejection = (status: number, data: unknown) => {
  const error = new (HTTPError as unknown as new (s: number, d: unknown) => Error)(status, data)
  return { json: () => Promise.reject(error) }
}

function renderSection(value: RoomsOverview = overview) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RoomsSection
        organizationId="org"
        eventId="event"
        overview={value}
        onChanged={vi.fn()}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.resetAllMocks())

describe("RoomsSection", () => {
  it("shows base beds, extra beds and their sum of a room in the selected term", () => {
    renderSection()
    const row = screen.getByRole("row", { name: /Chatka/ })
    expect(
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(expect.arrayContaining(["Dostupný", "4", "1", "5"]))
  })

  it("shows the base beds, extra beds and availability of the term picked in the tabs", async () => {
    renderSection()
    const row = () => screen.getByRole("row", { name: /Chatka/ })
    expect(within(row()).getByText("Dostupný")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("tab", { name: "Turnus 2" }))

    expect(screen.getByRole("tab", { name: "Turnus 2" })).toHaveAttribute("aria-selected", "true")
    expect(within(row()).getByText("Nedostupný")).toBeInTheDocument()
    expect(within(row()).getAllByText("–")).toHaveLength(3)
  })

  it("keeps the picked term after a room is saved", async () => {
    requests.put.mockReturnValue({
      json: () => Promise.resolve(roomsOverviewSchema.parse(overview)),
    })
    renderSection()
    await userEvent.click(screen.getByRole("tab", { name: "Turnus 2" }))
    await userEvent.click(screen.getByRole("button", { name: "Upravit pokoj Chatka" }))
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(requests.put).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(screen.getByRole("tab", { name: "Turnus 2" })).toHaveAttribute("aria-selected", "true")
  })

  it("shows an empty state with the add action and zero capacity", () => {
    renderSection({ rooms: [], terms: [term(T1, "Turnus 1", 0, 0, 0)] })
    expect(screen.getByText("Zatím žádné pokoje")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Přidat pokoj" })).toBeInTheDocument()
  })

  it("explains that an event without terms has nothing to set", () => {
    renderSection({ rooms: [], terms: [] })
    expect(screen.getByText("Akce zatím nemá žádné termíny")).toBeInTheDocument()
  })

  it("saves the beds of each term separately", async () => {
    requests.put.mockReturnValue({
      json: () => Promise.resolve(roomsOverviewSchema.parse(overview)),
    })
    renderSection()
    await userEvent.click(screen.getByRole("button", { name: "Upravit pokoj Chatka" }))
    const beds = screen.getAllByRole("textbox", { name: "Základní lůžka" })
    await userEvent.clear(beds[0]!)
    await userEvent.type(beds[0]!, "3")
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(requests.put).toHaveBeenCalledWith(`organizations/org/events/event/rooms/${ROOM}`, {
      json: {
        label: "Chatka",
        terms: [
          { termId: T1, isAvailable: true, baseBeds: 3, extraBeds: 1 },
          { termId: T2, isAvailable: false, baseBeds: 6, extraBeds: 2 },
        ],
      },
    })
  })

  it("marks an invalid value and does not save", async () => {
    renderSection()
    await userEvent.click(screen.getByRole("button", { name: "Upravit pokoj Chatka" }))
    const beds = screen.getAllByRole("textbox", { name: "Základní lůžka" })
    await userEvent.clear(beds[0]!)
    await userEvent.type(beds[0]!, "-1")
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(beds[0]).toBeInvalid()
    expect(requests.put).not.toHaveBeenCalled()
  })

  it("names the terms, capacity and confirmed participants of a refused change", async () => {
    requests.put.mockReturnValue(
      rejection(409, {
        code: "capacity_below_confirmed",
        conflicts: [
          { termId: T1, termLabel: "Turnus 1", proposedCapacity: 2, confirmedParticipants: 5 },
        ],
      }),
    )
    renderSection()
    await userEvent.click(screen.getByRole("button", { name: "Upravit pokoj Chatka" }))
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText("Změnu nelze uložit")).toBeInTheDocument()
    expect(screen.getByText(/Turnus 1 \(nová kapacita 2, potvrzeno 5\)/)).toBeInTheDocument()
    // The entered values stay for a correction.
    expect(screen.getAllByRole("textbox", { name: "Základní lůžka" })[0]).toHaveValue("4")
  })

  it.each([
    ["a server error", () => rejection(500, {})],
    ["a lost connection", () => ({ json: () => Promise.reject(new TypeError("Failed to fetch")) })],
  ])("on %s shows an error, keeps the values and no success", async (_name, failure) => {
    requests.put.mockReturnValueOnce(failure())
    renderSection()
    await userEvent.click(screen.getByRole("button", { name: "Upravit pokoj Chatka" }))
    const label = screen.getByRole("textbox", { name: "Označení" })
    await userEvent.clear(label)
    await userEvent.type(label, "Nová chatka")
    const beds = screen.getAllByRole("textbox", { name: "Základní lůžka" })
    await userEvent.clear(beds[0]!)
    await userEvent.type(beds[0]!, "3")
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText(/nepodařilo uložit/)).toBeInTheDocument()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByRole("textbox", { name: "Označení" })).toHaveValue("Nová chatka")
    expect(screen.getAllByRole("textbox", { name: "Základní lůžka" })[0]).toHaveValue("3")

    // Retrying sends the same values and only then confirms.
    requests.put.mockReturnValueOnce({
      json: () => Promise.resolve(roomsOverviewSchema.parse(overview)),
    })
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))
    expect(requests.put).toHaveBeenCalledTimes(2)
    expect(requests.put.mock.calls[1]).toEqual(requests.put.mock.calls[0])
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Pokoj byl upraven."))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("tells why a room cannot be deleted instead of confirming", async () => {
    requests.delete.mockReturnValue(
      rejection(409, {
        code: "capacity_below_confirmed",
        conflicts: [
          { termId: T1, termLabel: "Turnus 1", proposedCapacity: 0, confirmedParticipants: 5 },
        ],
      }),
    )
    renderSection()
    await userEvent.click(screen.getByRole("button", { name: "Odstranit pokoj Chatka" }))
    await userEvent.click(screen.getByRole("button", { name: "Odstranit" }))

    expect(await screen.findByText("Pokoj „Chatka“ nelze odstranit")).toBeInTheDocument()
  })
})
