import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TermEvaluationSection } from "@/features/accommodation/components/TermEvaluationSection"
import {
  EVALUATED_TERM,
  makeRunEvidence,
  makeRuns,
  makeTermEvaluation,
} from "@/features/accommodation/fixtures/evaluation"

const { get, post, FakeHTTPError } = vi.hoisted(() => {
  class FakeHTTPError extends Error {
    constructor(
      public response: { status: number },
      public data: unknown,
    ) {
      super("HTTP error")
    }
  }
  return { get: vi.fn(), post: vi.fn(), FakeHTTPError }
})

vi.mock("@/lib/api-client", () => ({ api: { get, post }, HTTPError: FakeHTTPError }))

const answer = (value: unknown) => ({ json: () => Promise.resolve(value) })
const refuse = (status: number, data: unknown) => ({
  json: () => Promise.reject(new FakeHTTPError({ status }, data)),
})

const SECOND = { ...EVALUATED_TERM, id: "0190c0de-0000-7000-8000-000000000102", label: "Turnus 2" }

const serve = (evaluation = makeTermEvaluation()) =>
  get.mockImplementation((path: string) =>
    path.endsWith("/runs")
      ? answer({ runs: makeRuns() })
      : path.includes("/runs/")
        ? answer(makeRunEvidence())
        : answer(evaluation),
  )

const onSelect = vi.fn()

function renderSection(queue = "all") {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TermEvaluationSection
        organizationId="org"
        eventId="event"
        terms={[EVALUATED_TERM, SECOND]}
        termId={EVALUATED_TERM.id}
        queue={queue}
        onSelect={onSelect}
        renderName={(person) => <a href={`/detail/${person.id}`}>{person.name}</a>}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  onSelect.mockReset()
})

describe("TermEvaluationSection", () => {
  it("shows the current proposal of the term with the results and links to the details", async () => {
    serve()
    renderSection()

    expect(await screen.findByText("Aktuální návrh")).toBeInTheDocument()
    expect(screen.getByText(/Aktualizuje se automaticky/)).toBeInTheDocument()
    const order = screen.getAllByRole("table").at(-1)!
    expect(within(order).getByRole("link", { name: "Tereza Nováková" })).toHaveAttribute(
      "href",
      "/detail/0190c0de-0000-7000-8000-000000000601",
    )
    expect(within(order).getAllByText("Vhodný")).toHaveLength(3)
    expect(within(order).getByText("Ruční určení")).toBeInTheDocument()
    // Confirming and moving come with later slices.
    expect(
      screen.queryByRole("button", { name: /Potvrdit všechny vhodné/ }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Akce:/ })).not.toBeInTheDocument()
  })

  it("recalculates on request and reads as running meanwhile", async () => {
    serve()
    post.mockReturnValue(answer(makeTermEvaluation({ status: "running" })))
    renderSection()

    await userEvent.click(await screen.findByRole("button", { name: "Přepočítat" }))

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        `organizations/org/events/event/accommodation/terms/${EVALUATED_TERM.id}/evaluation`,
      ),
    )
    expect(await screen.findByRole("button", { name: "Přepočítává se…" })).toBeDisabled()
  })

  it("keeps the shown data and explains a refused recalculation", async () => {
    serve()
    post.mockReturnValue(refuse(404, { message: "Záznam není dostupný" }))
    renderSection()

    await userEvent.click(await screen.findByRole("button", { name: "Přepočítat" }))

    expect(await screen.findByText("Přepočet se nepodařilo spustit")).toBeInTheDocument()
    expect(screen.getByText("Záznam není dostupný")).toBeInTheDocument()
    expect(screen.getByText("Aktuální návrh")).toBeInTheDocument()
  })

  it("switches the term and the queue through the URL", async () => {
    serve()
    renderSection()

    await userEvent.click(await screen.findByRole("tab", { name: "Turnus 2" }))
    expect(onSelect).toHaveBeenCalledWith({ termId: SECOND.id, queue: "all" })

    await userEvent.click(screen.getByRole("tab", { name: /^Žena/ }))
    expect(onSelect).toHaveBeenLastCalledWith({ termId: EVALUATED_TERM.id, queue: "female" })
  })

  it("opens the evidence of a run from the history", async () => {
    serve()
    renderSection()

    const history = await screen.findByText("Historie termínu")
    const buttons = await within(history.closest<HTMLElement>("[data-slot='card']")!).findAllByRole(
      "button",
      { name: "Doklad" },
    )
    await userEvent.click(buttons[0]!)

    expect(await screen.findByRole("dialog", { name: "Doklad vyhodnocení" })).toBeInTheDocument()
    expect(screen.getByText("Chatka Sova")).toBeInTheDocument()
  })

  it("explains a failed load and loads again", async () => {
    get.mockImplementation((path: string) =>
      path.endsWith("/runs") ? answer({ runs: [] }) : refuse(500, {}),
    )
    renderSection()

    expect(await screen.findByText("Vyhodnocení termínu se nepodařilo načíst")).toBeInTheDocument()
    serve()
    await userEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }))
    expect(await screen.findByText("Aktuální návrh")).toBeInTheDocument()
  })

  it("shows the whole term for a queue the term does not have", async () => {
    serve()
    renderSection("nobody")

    expect(await screen.findByRole("tab", { name: "Celý termín (5)" })).toHaveAttribute(
      "data-state",
      "active",
    )
  })
})
