import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ParticipantTermProgrammes } from "@/features/programme/components/ParticipantTermProgrammes"

const requests = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock("@/lib/api-client", () => ({ api: requests, HTTPError: class HTTPError extends Error {} }))

const T1 = "0190c0de-0000-7000-8000-000000000011"
const T2 = "0190c0de-0000-7000-8000-000000000012"

const terms = [
  { termId: T1, label: "Turnus 1", startDate: "2026-11-06", endDate: "2026-11-08" },
  { termId: T2, label: "Turnus 2", startDate: "2026-11-20", endDate: "2026-11-22" },
] as const

function renderProgrammes(statuses: ["confirmed" | "waitlisted", "confirmed" | "waitlisted"]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ParticipantTermProgrammes
        registrationId="0190c0de-0000-7000-8000-000000000401"
        terms={terms.map((term, index) => ({ ...term, status: statuses[index] ?? "waitlisted" }))}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("ParticipantTermProgrammes", () => {
  it("reads only the confirmed term and explains the waitlisted one", async () => {
    requests.get.mockReturnValue({
      json: () =>
        Promise.resolve({
          items: [
            {
              id: "0190c0de-0000-7000-8000-000000000501",
              title: "Společná večeře",
              startDate: "2026-11-06",
              startTime: "19:00",
              place: "Jídelna",
              description: null,
            },
          ],
        }),
    })
    renderProgrammes(["confirmed", "waitlisted"])

    expect(await screen.findByText("Společná večeře")).toBeInTheDocument()
    expect(screen.getByText("Pátek 6. 11. 2026")).toBeInTheDocument()
    expect(
      screen.getByText("Program je dostupný až po potvrzení účasti v tomto termínu."),
    ).toBeInTheDocument()
    expect(requests.get).toHaveBeenCalledTimes(1)
    expect(requests.get).toHaveBeenCalledWith(expect.stringContaining(`/terms/${T1}/programme`))
  })

  it("says that a confirmed term without items has no programme yet", async () => {
    requests.get.mockReturnValue({ json: () => Promise.resolve({ items: [] }) })
    renderProgrammes(["confirmed", "waitlisted"])
    expect(await screen.findByText("Program zatím není připravený.")).toBeInTheDocument()
  })

  it("shows a failed load with a retry instead of an empty programme", async () => {
    requests.get.mockReturnValue({ json: () => Promise.reject(new Error("offline")) })
    renderProgrammes(["confirmed", "waitlisted"])
    expect(await screen.findByText("Program se nepodařilo načíst")).toBeInTheDocument()
    expect(screen.queryByText("Program zatím není připravený.")).not.toBeInTheDocument()
  })
})
