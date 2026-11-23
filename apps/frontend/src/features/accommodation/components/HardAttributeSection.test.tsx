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

async function chooseRule(label: "Bez rozdělení" | "Pohlaví pro ubytování") {
  const select = await screen.findByRole("combobox", { name: "Pokoje dělit podle" })
  await userEvent.click(select)
  await userEvent.click(await screen.findByRole("option", { name: label }))
}

function renderSection(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  render(
    <QueryClientProvider client={client}>
      <HardAttributeSection
        organizationId="org"
        eventId="event"
        invalidate={[REGISTRATIONS]}
      />
    </QueryClientProvider>,
  )
  return client
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: () => false,
  })
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: () => undefined,
  })
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: () => undefined,
  })
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: () => undefined,
  })
  get.mockReset()
  put.mockReset()
})

describe("HardAttributeSection", () => {
  it("disables save until the room rule changes", async () => {
    get.mockReturnValue(answer(makeHardAttributeSetting("gender")))
    renderSection()

    const save = await screen.findByRole("button", { name: "Uložit pravidlo" })
    expect(save).toBeDisabled()
    await chooseRule("Bez rozdělení")
    expect(save).toBeEnabled()
    await chooseRule("Pohlaví pro ubytování")
    expect(save).toBeDisabled()
  })

  it("starts on the saved rule and saves none", async () => {
    get.mockReturnValue(answer(makeHardAttributeSetting("gender")))
    put.mockReturnValue(answer(makeHardAttributeSetting(null)))
    const client = renderSection()
    const invalidate = vi.spyOn(client, "invalidateQueries")

    expect(await screen.findByRole("combobox", { name: "Pokoje dělit podle" })).toHaveTextContent(
      "Pohlaví pro ubytování",
    )
    await chooseRule("Bez rozdělení")
    await userEvent.click(screen.getByRole("button", { name: "Uložit pravidlo" }))

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(PATH, {
        json: { hardAttribute: null, nonDeterminingValues: [] },
      }),
    )
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

    expect(await screen.findByRole("combobox", { name: "Pokoje dělit podle" })).toHaveTextContent(
      "Bez rozdělení",
    )
    await chooseRule("Pohlaví pro ubytování")
    await userEvent.click(screen.getByRole("button", { name: "Uložit pravidlo" }))

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(PATH, {
        // Gender's defaults: "Jiná odpověď" and "Nechci uvést" decide no room.
        json: { hardAttribute: "gender", nonDeterminingValues: ["other", "undisclosed"] },
      }),
    )
  })

  it("keeps the choice and says which rule still applies when saving fails", async () => {
    get.mockReturnValue(answer(makeHardAttributeSetting("gender")))
    put.mockReturnValue({ json: () => Promise.reject(new FakeHTTPError({ status: 500 }, {})) })
    renderSection()

    await chooseRule("Bez rozdělení")
    await userEvent.click(screen.getByRole("button", { name: "Uložit pravidlo" }))

    expect(await screen.findByText("Pravidlo se nepodařilo uložit")).toBeInTheDocument()
    expect(screen.getByText("Pokoje se dál dělí podle: Pohlaví.")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Pokoje dělit podle" })).toHaveTextContent(
      "Bez rozdělení",
    )
  })

  it("offers a retry when the rule cannot be loaded", async () => {
    get.mockReturnValue({ json: () => Promise.reject(new FakeHTTPError({ status: 500 }, {})) })
    renderSection()

    expect(await screen.findByText("Pravidla ubytování se nepodařilo načíst")).toBeInTheDocument()
  })
})
