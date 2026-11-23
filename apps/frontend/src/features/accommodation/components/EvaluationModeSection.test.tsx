import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { EvaluationModeSection } from "@/features/accommodation/components/EvaluationModeSection"

const { get, put, FakeHTTPError, toast } = vi.hoisted(() => {
  class FakeHTTPError extends Error {
    constructor(
      public response: { status: number },
      public data: unknown,
    ) {
      super("HTTP error")
    }
  }
  return { get: vi.fn(), put: vi.fn(), FakeHTTPError, toast: { success: vi.fn(), error: vi.fn() } }
})

vi.mock("@/lib/api-client", () => ({ api: { get, put }, HTTPError: FakeHTTPError }))
vi.mock("sonner", () => ({ toast }))

const answer = (value: unknown) => ({ json: () => Promise.resolve(value) })
const evaluationPath = "organizations/org/events/event/accommodation/evaluation-mode"
const roomsPath = "organizations/org/events/event/accommodation/room-proposal-mode"
let savedModes: { evaluation: "automatic" | "manual"; rooms: "automatic" | "manual" }

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
  savedModes = { evaluation: "automatic", rooms: "manual" }
  toast.success.mockReset()
  toast.error.mockReset()
  get.mockImplementation((path: string) =>
    answer({ mode: path.endsWith("evaluation-mode") ? savedModes.evaluation : savedModes.rooms }),
  )
  put.mockImplementation((path: string, options: { json: { mode: "automatic" | "manual" } }) => {
    if (path === evaluationPath) savedModes.evaluation = options.json.mode
    if (path === roomsPath) savedModes.rooms = options.json.mode
    return answer({ mode: options.json.mode })
  })
})

describe("EvaluationModeSection", () => {
  it("shows independent mixed modes and one shared save", async () => {
    renderSection()

    const evaluation = await screen.findByRole("switch", { name: "Automaticky vyhodnocovat účast" })
    const rooms = screen.getByRole("switch", { name: "Automaticky navrhovat pokoje" })
    const save = screen.getByRole("button", { name: "Uložit automatizaci" })
    expect(evaluation).toBeChecked()
    expect(rooms).not.toBeChecked()
    expect(save).toBeDisabled()

    await userEvent.click(evaluation)
    await userEvent.click(rooms)
    await userEvent.click(save)

    await waitFor(() => expect(save).toBeDisabled())
    expect(put).toHaveBeenCalledTimes(2)
    expect(put).toHaveBeenCalledWith(evaluationPath, { json: { mode: "manual" } })
    expect(put).toHaveBeenCalledWith(roomsPath, { json: { mode: "automatic" } })
    expect(toast.success).toHaveBeenCalledWith("Automatizace byla uložena.")
  })

  it("keeps a partially failed choice and retries only that mode", async () => {
    let roomSaves = 0
    put.mockImplementation((path: string, options: { json: { mode: "automatic" | "manual" } }) => {
      if (path === roomsPath && roomSaves++ === 0) {
        return { json: () => Promise.reject(new FakeHTTPError({ status: 500 }, {})) }
      }
      if (path === evaluationPath) savedModes.evaluation = options.json.mode
      if (path === roomsPath) savedModes.rooms = options.json.mode
      return answer({ mode: options.json.mode })
    })
    renderSection()

    const evaluation = await screen.findByRole("switch", { name: "Automaticky vyhodnocovat účast" })
    const rooms = screen.getByRole("switch", { name: "Automaticky navrhovat pokoje" })
    const save = screen.getByRole("button", { name: "Uložit automatizaci" })
    await userEvent.click(evaluation)
    await userEvent.click(rooms)
    await userEvent.click(save)

    expect(
      await screen.findByText("Automatické navrhování pokojů se nepodařilo uložit"),
    ).toBeInTheDocument()
    expect(evaluation).not.toBeChecked()
    expect(rooms).toBeChecked()
    expect(save).toBeEnabled()
    expect(toast.success).not.toHaveBeenCalled()

    await userEvent.click(save)
    await waitFor(() => expect(save).toBeDisabled())
    expect(put).toHaveBeenCalledTimes(3)
    expect(toast.success).toHaveBeenCalledTimes(1)
  })

  it("blocks duplicate saves while the changed modes are being written", async () => {
    let resolveSave: (() => void) | undefined
    put.mockImplementation((path: string, options: { json: { mode: "automatic" | "manual" } }) => ({
      json: () =>
        new Promise((resolve) => {
          resolveSave = () => {
            if (path === evaluationPath) savedModes.evaluation = options.json.mode
            if (path === roomsPath) savedModes.rooms = options.json.mode
            resolve({ mode: options.json.mode })
          }
        }),
    }))
    renderSection()

    const evaluation = await screen.findByRole("switch", { name: "Automaticky vyhodnocovat účast" })
    const save = screen.getByRole("button", { name: "Uložit automatizaci" })
    await userEvent.click(evaluation)
    await userEvent.click(save)
    expect(save).toBeDisabled()
    await userEvent.click(save)
    expect(put).toHaveBeenCalledTimes(1)

    resolveSave?.()
    await waitFor(() => expect(save).toBeDisabled())
  })
})
