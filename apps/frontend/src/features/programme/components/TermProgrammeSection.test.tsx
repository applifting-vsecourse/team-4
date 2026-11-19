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
    endTime: "21:00",
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
  it("shows every day of the term, the empty ones with their own add button", async () => {
    requests.get.mockReturnValue(respond({ items: [] }))
    renderSection()
    expect(await screen.findByText("Pátek 6. 11. 2026")).toBeInTheDocument()
    expect(screen.getByText("Sobota 7. 11. 2026")).toBeInTheDocument()
    expect(screen.getByText("Neděle 8. 11. 2026")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Přidat položku" })).toHaveLength(3)
  })

  it("opens a day to its items", async () => {
    requests.get.mockReturnValue(respond(programme(["Večeře"])))
    renderSection()
    expect(await screen.findByRole("button", { name: /Večeře/ })).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: /Pátek 6\. 11\. 2026/ }))
    await waitFor(() => expect(screen.queryByRole("button", { name: /Večeře/ })).toBeNull())
    await userEvent.click(screen.getByRole("button", { name: /Pátek 6\. 11\. 2026/ }))
    expect(await screen.findByRole("button", { name: /Večeře/ })).toBeVisible()
  })

  it("adds an item on the day whose button was used, with the date filled in", async () => {
    requests.get.mockReturnValue(respond({ items: [] }))
    requests.post.mockReturnValue(respond(programme(["Snídaně"])))
    renderSection()
    await screen.findByText("Sobota 7. 11. 2026")
    await userEvent.click(screen.getAllByRole("button", { name: "Přidat položku" })[1]!)
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText("Datum")).toHaveTextContent("7. 11. 2026")
    await userEvent.type(within(dialog).getByLabelText("Název"), "Snídaně")
    await userEvent.type(within(dialog).getByLabelText("Začátek"), "08:30")
    await userEvent.type(within(dialog).getByLabelText("Konec"), "09:15")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit položku" }))

    await waitFor(() =>
      expect(requests.post).toHaveBeenCalledWith(expect.stringContaining("/programme"), {
        json: {
          title: "Snídaně",
          startDate: "2026-11-07",
          startTime: "08:30",
          endTime: "09:15",
          place: null,
          description: null,
        },
      }),
    )
    expect(toast.success).toHaveBeenCalledWith("Položka byla přidána.")
  })

  it("shows a failed load with a retry, never an empty programme", async () => {
    requests.get.mockReturnValueOnce(await refuse(500, {}))
    renderSection()
    expect(await screen.findByText("Program se nepodařilo načíst")).toBeInTheDocument()
    expect(screen.queryByText("Bez položek")).not.toBeInTheDocument()

    requests.get.mockReturnValue(respond(programme(["Večeře"])))
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByText("Večeře")).toBeInTheDocument()
  })

  it("explains the missing fields at the fields and saves nothing", async () => {
    requests.get.mockReturnValue(respond({ items: [] }))
    renderSection()
    await userEvent.click((await screen.findAllByRole("button", { name: "Přidat položku" }))[0]!)
    const dialog = await screen.findByRole("dialog")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit položku" }))

    expect(await within(dialog).findByText("Vyplňte název položky.")).toBeInTheDocument()
    expect(within(dialog).getByText("Zadejte čas začátku.")).toBeInTheDocument()
    expect(within(dialog).getByText("Zadejte čas konce.")).toBeInTheDocument()
    expect(requests.post).not.toHaveBeenCalled()
  })

  it("refuses an end that is not later than the start and keeps the input", async () => {
    requests.get.mockReturnValue(respond({ items: [] }))
    renderSection()
    await userEvent.click((await screen.findAllByRole("button", { name: "Přidat položku" }))[0]!)
    const dialog = await screen.findByRole("dialog")
    await userEvent.type(within(dialog).getByLabelText("Název"), "Večeře")
    await userEvent.type(within(dialog).getByLabelText("Začátek"), "19:00")
    await userEvent.type(within(dialog).getByLabelText("Konec"), "19:00")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit položku" }))

    expect(
      await within(dialog).findByText("Čas konce musí být pozdější než čas začátku."),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Název")).toHaveValue("Večeře")
    expect(requests.post).not.toHaveBeenCalled()
  })

  it("keeps the form and shows no success when saving fails", async () => {
    requests.get.mockReturnValue(respond(programme(["Večeře"])))
    requests.put.mockReturnValue(await refuse(500, {}))
    renderSection()
    await userEvent.click(await screen.findByRole("button", { name: /Večeře/ }))
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
    await userEvent.click(await screen.findByRole("button", { name: /Večeře/ }))
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
        endTime: "21:00",
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
    await userEvent.click(await screen.findByRole("button", { name: /Večeře/ }))
    const edit = await screen.findByRole("dialog")
    await userEvent.click(within(edit).getByRole("button", { name: "Odstranit" }))
    const confirm = (await screen.findAllByRole("dialog")).at(-1)!
    await userEvent.click(within(confirm).getByRole("button", { name: "Odstranit" }))
    expect(
      await within(confirm).findByText("Položku se nepodařilo odstranit. Zkuste to prosím znovu."),
    ).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()

    requests.delete.mockReturnValue(respond({ items: [] }))
    await userEvent.click(within(confirm).getByRole("button", { name: "Odstranit" }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Položka byla odstraněna."))
    await waitFor(() => expect(screen.queryByRole("button", { name: /Večeře/ })).toBeNull())
  })
})
