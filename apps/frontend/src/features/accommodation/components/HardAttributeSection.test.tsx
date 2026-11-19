import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { evaluationKeys } from "@/features/accommodation/api/evaluationQueryOptions"
import { HardAttributeSection } from "@/features/accommodation/components/HardAttributeSection"
import { makeHardAttributeSetting } from "@/features/accommodation/fixtures/evaluation"

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
const PATH = "organizations/org/events/event/accommodation/hard-attribute"
/** A key of another feature, passed in by the route. */
const REGISTRATIONS = ["event-registrations", "org", "event"]

function renderSection(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  render(
    <QueryClientProvider client={client}>
      <HardAttributeSection
        organizationId="org"
        eventId="event"
        invalidate={REGISTRATIONS}
      />
    </QueryClientProvider>,
  )
  return client
}

beforeEach(() => {
  get.mockReset()
  put.mockReset()
})

describe("HardAttributeSection", () => {
  it("starts on the saved rule and saves none", async () => {
    get.mockReturnValue(answer(makeHardAttributeSetting("gender")))
    put.mockReturnValue(answer(makeHardAttributeSetting(null)))
    const client = renderSection()
    const invalidate = vi.spyOn(client, "invalidateQueries")

    expect(await screen.findByRole("radio", { name: "Pohlaví" })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: "Nedělit" }))
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() => expect(put).toHaveBeenCalledWith(PATH, { json: { hardAttribute: null } }))
    await waitFor(() =>
      expect(client.getQueryData(evaluationKeys.hardAttribute("org", "event"))).toEqual(
        makeHardAttributeSetting(null),
      ),
    )
    // The evaluation and the registrations follow the new rule.
    expect(invalidate).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: evaluationKeys.event("org", "event") }),
    )
    expect(invalidate).toHaveBeenCalledWith({ queryKey: REGISTRATIONS })
    expect(get).toHaveBeenCalledTimes(1)
  })

  it("saves the gender rule from none", async () => {
    get.mockReturnValue(answer(makeHardAttributeSetting(null)))
    put.mockReturnValue(answer(makeHardAttributeSetting("gender")))
    renderSection()

    expect(await screen.findByRole("radio", { name: "Nedělit" })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: "Pohlaví" }))
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(PATH, { json: { hardAttribute: "gender" } }),
    )
  })

  it("keeps the choice and says which rule still applies when saving fails", async () => {
    get.mockReturnValue(answer(makeHardAttributeSetting("gender")))
    put.mockReturnValue({ json: () => Promise.reject(new FakeHTTPError({ status: 500 }, {})) })
    renderSection()

    await userEvent.click(await screen.findByRole("radio", { name: "Nedělit" }))
    await userEvent.click(screen.getByRole("button", { name: "Uložit" }))

    expect(await screen.findByText("Pravidlo se nepodařilo uložit")).toBeInTheDocument()
    expect(screen.getByText("Pokoje se dál dělí podle: Pohlaví.")).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "Nedělit" })).toBeChecked()
  })

  it("offers a retry when the rule cannot be loaded", async () => {
    get.mockReturnValue({ json: () => Promise.reject(new FakeHTTPError({ status: 500 }, {})) })
    renderSection()

    expect(await screen.findByText("Pravidla ubytování se nepodařilo načíst")).toBeInTheDocument()
  })
})
