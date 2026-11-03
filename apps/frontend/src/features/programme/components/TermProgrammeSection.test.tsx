import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TermProgrammeSection } from "@/features/programme/components/TermProgrammeSection"

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock("sonner", () => ({ toast }))

const requests = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

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

const TERM = {
  id: "0190c0de-0000-7000-8000-000000000011",
  label: "Turnus 1",
  startDate: "2026-11-06",
  endDate: "2026-11-08",
}
const ITEM_ID = "0190c0de-0000-7000-8000-000000000501"

const programme = (titles: string[]) => ({
  items: titles.map((title, index) => ({
    id: index === 0 ? ITEM_ID : `0190c0de-0000-7000-8000-00000000050${index + 1}`,
    title,
    startDate: "2026-11-06",
    startTime: "19:00",
    place: null,
    description: null,
  })),
})

const respond = (body: unknown) => ({ json: () => Promise.resolve(body) })
const refuse = async (status: number, data: unknown) => {
  const { HTTPError } = await import("@/lib/api-client")
  const Refusal = HTTPError as unknown as new (status: number, data: unknown) => Error
  return { json: () => Promise.reject(new Refusal(status, data)) }
}

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <TermProgrammeSection
        organizationId="org"
        eventId="event"
        term={TERM}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("TermProgrammeSection", () => {
  it("offers the first item for an empty programme", async () => {
    requests.get.mockReturnValue(respond({ items: [] }))
    renderSection()
    expect(await screen.findByText("Program zatím nemá žádné položky")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Přidat položku/ })).toBeInTheDocument()
  })

  it("shows a failed load with a retry, never an empty programme", async () => {
    requests.get.mockReturnValueOnce(await refuse(500, {}))
    renderSection()
    expect(await screen.findByText("Program se nepodařilo načíst.")).toBeInTheDocument()
    expect(screen.queryByText("Program zatím nemá žádné položky")).not.toBeInTheDocument()

    requests.get.mockReturnValue(respond(programme(["Večeře"])))
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByText("Večeře")).toBeInTheDocument()
  })

  it("keeps the dialog and the input when the day is outside the term, saving nothing", async () => {
    requests.get.mockReturnValue(respond({ items: [] }))
    renderSection()
    await userEvent.click(await screen.findByRole("button", { name: /Přidat položku/ }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.type(within(dialog).getByLabelText("Název"), "Snídaně")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit položku" }))

    expect(await within(dialog).findByText("Vyberte platné datum.")).toBeInTheDocument()
    expect(within(dialog).getByText("Zadejte čas začátku.")).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Název")).toHaveValue("Snídaně")
    expect(requests.post).not.toHaveBeenCalled()
  })

  it("keeps the form and shows no success when saving fails", async () => {
    requests.get.mockReturnValue(respond(programme(["Večeře"])))
    requests.put.mockReturnValue(await refuse(500, {}))
    renderSection()
    await userEvent.click(await screen.findByRole("button", { name: "Upravit položku Večeře" }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.clear(within(dialog).getByLabelText("Název"))
    await userEvent.type(within(dialog).getByLabelText("Název"), "Nová večeře")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit položku" }))

    expect(
      await within(dialog).findByText("Položku se nepodařilo uložit. Zkuste to prosím znovu."),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Název")).toHaveValue("Nová večeře")
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("edits an item and shows the programme the server answers with", async () => {
    requests.get.mockReturnValue(respond(programme(["Večeře"])))
    requests.put.mockReturnValue(respond(programme(["Nová večeře"])))
    renderSection()
    await userEvent.click(await screen.findByRole("button", { name: "Upravit položku Večeře" }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.clear(within(dialog).getByLabelText("Název"))
    await userEvent.type(within(dialog).getByLabelText("Název"), "Nová večeře")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit položku" }))

    expect(await screen.findByText("Nová večeře")).toBeInTheDocument()
    expect(requests.put).toHaveBeenCalledWith(expect.stringContaining(`/programme/${ITEM_ID}`), {
      json: {
        title: "Nová večeře",
        startDate: "2026-11-06",
        startTime: "19:00",
        place: null,
        description: null,
      },
    })
    expect(toast.success).toHaveBeenCalledWith("Položka byla upravena.")
  })

  it("keeps the item when deleting fails and removes it after a confirmed delete", async () => {
    requests.get.mockReturnValue(respond(programme(["Večeře"])))
    requests.delete.mockReturnValueOnce(await refuse(500, {}))
    renderSection()
    await userEvent.click(await screen.findByRole("button", { name: "Smazat položku Večeře" }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Smazat" }))
    expect(
      await within(dialog).findByText("Položku se nepodařilo smazat. Zkuste to prosím znovu."),
    ).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()

    requests.delete.mockReturnValue(respond({ items: [] }))
    await userEvent.click(within(dialog).getByRole("button", { name: "Smazat" }))
    await waitFor(() =>
      expect(screen.getByText("Program zatím nemá žádné položky")).toBeInTheDocument(),
    )
  })
})
