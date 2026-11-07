import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EvaluationModeSection } from "@/features/accommodation/components/EvaluationModeSection"

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
      <EvaluationModeSection
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

describe("EvaluationModeSection", () => {
  it("starts on the saved mode and saves the chosen one", async () => {
    get.mockReturnValue(answer({ mode: "automatic" }))
    put.mockReturnValue(answer({ mode: "manual" }))
    renderSection()

    expect(
      await screen.findByRole("radio", { name: "Přepočítat návrh automaticky po každé změně" }),
    ).toBeChecked()
    await userEvent.click(
      screen.getByRole("radio", { name: "Přepočítat návrh jen tlačítkem Přepočítat" }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(
        "organizations/org/events/event/accommodation/evaluation-mode",
        {
          json: { mode: "manual" },
        },
      ),
    )
  })

  it("says which mode still applies when saving fails", async () => {
    get.mockReturnValue(answer({ mode: "automatic" }))
    put.mockReturnValue({ json: () => Promise.reject(new FakeHTTPError({ status: 500 }, {})) })
    renderSection()

    await userEvent.click(
      await screen.findByRole("radio", { name: "Přepočítat návrh jen tlačítkem Přepočítat" }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText("Režim se nepodařilo uložit")).toBeInTheDocument()
    expect(screen.getByText("Platí dál automatický přepočet.")).toBeInTheDocument()
  })
})
