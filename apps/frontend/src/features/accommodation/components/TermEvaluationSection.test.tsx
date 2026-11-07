import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { TermEvaluationSection } from "@/features/accommodation/components/TermEvaluationSection"
import {
  EVALUATED_TERM,
  makeRunEvidence,
  makeRuns,
  makeTermEvaluation,
} from "@/features/accommodation/fixtures/evaluation"

const { get, post, put, FakeHTTPError } = vi.hoisted(() => {
  class FakeHTTPError extends Error {
    constructor(
      public response: { status: number },
      public data: unknown,
    ) {
      super("HTTP error")
    }
  }
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), FakeHTTPError }
})

vi.mock("@/lib/api-client", () => ({ api: { get, post, put }, HTTPError: FakeHTTPError }))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

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

// Radix Select needs pointer capture and scrolling, which jsdom lacks.
beforeAll(() => {
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  })
})

beforeEach(() => {
  get.mockReset()
  post.mockReset()
  put.mockReset()
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
    // Confirming and moving come with later slices; only who needs a
    // determination has an action.
    expect(
      screen.queryByRole("button", { name: /Potvrdit všechny vhodné/ }),
    ).not.toBeInTheDocument()
    expect(within(order).getAllByRole("button", { name: /^Akce:/ })).toHaveLength(1)
    expect(within(order).getByRole("button", { name: "Akce: Alex Šimek" })).toBeInTheDocument()
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

  it("determines the accommodation of a person from the order, with a reason", async () => {
    serve()
    put.mockReturnValue(
      answer({
        hardAttribute: makeTermEvaluation().hardAttribute,
        answer: "undisclosed",
        determination: null,
        effectiveValue: "male",
        needsDetermination: false,
        history: [],
      }),
    )
    renderSection()

    await userEvent.click(await screen.findByRole("button", { name: "Akce: Alex Šimek" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Určit ubytování" }))
    const dialog = await screen.findByRole("dialog", { name: "Určit ubytování" })
    expect(within(dialog).getByText("Nechci uvést")).toBeInTheDocument()

    // Nothing is sent without a value and a reason.
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit určení" }))
    expect(await within(dialog).findByText("Vyberte hodnotu.")).toBeInTheDocument()
    expect(within(dialog).getByText("Uveďte důvod.")).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: "Muž" }))
    await userEvent.type(within(dialog).getByLabelText("Důvod"), "Domluva s rodiči")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit určení" }))

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(
        "organizations/org/events/event/registrations/0190c0de-0000-7000-8000-000000000603/accommodation/determination",
        { json: { value: "male", reason: "Domluva s rodiči", answer: "undisclosed" } },
      ),
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Určit ubytování" })).not.toBeInTheDocument(),
    )
  })

  it("keeps the dialog and the entries when the determination is refused", async () => {
    serve()
    put.mockReturnValue(
      refuse(409, {
        code: "answer_changed",
        message: "Účastník mezitím změnil odpověď. Načtěte ji znovu.",
      }),
    )
    renderSection()

    await userEvent.click(await screen.findByRole("button", { name: "Akce: Alex Šimek" }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Určit ubytování" }))
    const dialog = await screen.findByRole("dialog", { name: "Určit ubytování" })
    await userEvent.click(within(dialog).getByRole("combobox"))
    await userEvent.click(await screen.findByRole("option", { name: "Žena" }))
    await userEvent.type(within(dialog).getByLabelText("Důvod"), "Dohoda")
    await userEvent.click(within(dialog).getByRole("button", { name: "Uložit určení" }))

    expect(
      await within(dialog).findByText("Účastník mezitím změnil odpověď. Načtěte ji znovu."),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Důvod")).toHaveValue("Dohoda")
  })
})
