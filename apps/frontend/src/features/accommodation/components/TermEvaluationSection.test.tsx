import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { TermEvaluationSection } from "@/features/accommodation/components/TermEvaluationSection"
import {
  EVALUATED_TERM,
  makeMoves,
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
const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: toastError } }))

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
        : path.endsWith("/order/moves")
          ? answer(makeMoves())
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
    // Confirming comes with slice 2. Who needs a determination, or can stand
    // next to someone of their queue, has an action; Jakub is alone in his.
    expect(
      screen.queryByRole("button", { name: /Potvrdit všechny vhodné/ }),
    ).not.toBeInTheDocument()
    expect(
      within(order)
        .getAllByRole("button", { name: /^Akce:/ })
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual([
      "Akce: Tereza Nováková",
      "Akce: Alex Šimek",
      "Akce: Anna Procházková",
      "Akce: Lucie Sedláčková",
    ])
    expect(within(order).getByText("Přesunuto ručně")).toBeInTheDocument()
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
        moves: [],
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

  describe("changing the order", () => {
    const MOVES = `organizations/org/events/event/accommodation/terms/${EVALUATED_TERM.id}/order/moves`

    const openMove = async (name: string) => {
      await userEvent.click(await screen.findByRole("button", { name: `Akce: ${name}` }))
      await userEvent.click(await screen.findByRole("menuitem", { name: "Změnit pořadí" }))
      return screen.findByRole("dialog", { name: `Změnit pořadí: ${name}` })
    }

    const fill = async (dialog: HTMLElement, target: RegExp, reason: string) => {
      await userEvent.click(within(dialog).getByRole("combobox"))
      await userEvent.click(await screen.findByRole("option", { name: target }))
      await userEvent.type(within(dialog).getByLabelText("Důvod"), reason)
    }

    it("lists runs and moves in the history of the term, newest first", async () => {
      serve()
      renderSection()

      const history = (await screen.findByText("Historie termínu")).closest<HTMLElement>(
        "[data-slot='card']",
      )!
      const entries = await within(history).findAllByRole("listitem")
      expect(entries.map((entry) => entry.textContent)).toEqual([
        expect.stringContaining("Vyhodnocení · Turnus 1"),
        expect.stringContaining("Změna pořadí · Anna Procházková · Turnus 1 · fronta Žena"),
        expect.stringContaining("Vyhodnocení · Turnus 1"),
      ])
      expect(within(history).getByText("Z 5. na 4. místo v pořadí termínu")).toBeInTheDocument()
    })

    it("places a person before another one of the queue after the review", async () => {
      serve()
      post.mockReturnValue(answer(makeTermEvaluation({ status: "stale", inputVersion: 5 })))
      renderSection()

      const dialog = await openMove("Lucie Sedláčková")
      expect(within(dialog).getByText("Turnus 1 · fronta Žena")).toBeInTheDocument()
      await fill(dialog, /Tereza Nováková/, " Organizační tým ")
      await userEvent.click(within(dialog).getByRole("button", { name: "Pokračovat" }))

      // The queue before and after, with the reason, before anything is sent.
      const [original, moved] = within(dialog).getAllByRole("list")
      expect(
        within(original!)
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(["Tereza Nováková", "Anna Procházková", "Lucie SedláčkováPřesouvá se"])
      expect(
        within(moved!)
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(["Lucie SedláčkováPřesouvá se", "Tereza Nováková", "Anna Procházková"])
      expect(within(dialog).getByText("Organizační tým")).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()

      await userEvent.click(within(dialog).getByRole("button", { name: "Uložit pořadí" }))

      await waitFor(() =>
        expect(post).toHaveBeenCalledWith(MOVES, {
          json: {
            registrationId: "0190c0de-0000-7000-8000-000000000605",
            targetId: "0190c0de-0000-7000-8000-000000000601",
            placement: "before",
            reason: "Organizační tým",
            expectedVersion: 4,
          },
        }),
      )
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "Změnit pořadí: Lucie Sedláčková" }),
        ).not.toBeInTheDocument(),
      )
    })

    it("sends nothing without a target and a reason, and keeps the other input", async () => {
      serve()
      renderSection()

      const dialog = await openMove("Tereza Nováková")
      await userEvent.click(within(dialog).getByRole("radio", { name: "Za osobu" }))
      await userEvent.click(within(dialog).getByRole("button", { name: "Pokračovat" }))

      expect(
        await within(dialog).findByText(
          "Vyberte osobu, před kterou nebo za kterou se má přesunout.",
        ),
      ).toBeInTheDocument()
      expect(within(dialog).getByText("Uveďte důvod změny pořadí.")).toBeInTheDocument()
      expect(within(dialog).getByRole("radio", { name: "Za osobu" })).toBeChecked()

      // Placing Tereza before Anna, who already stands after her, changes nothing.
      await userEvent.click(within(dialog).getByRole("radio", { name: "Před osobu" }))
      await fill(dialog, /Anna Procházková/, "Organizační tým")
      await userEvent.click(within(dialog).getByRole("button", { name: "Pokračovat" }))
      expect(
        await within(dialog).findByText("Osoba už na tomto místě stojí. Pořadí by se nezměnilo."),
      ).toBeInTheDocument()
      expect(within(dialog).getByLabelText("Důvod")).toHaveValue("Organizační tým")
      expect(post).not.toHaveBeenCalled()
    })

    it("refuses a stale move and asks for a new confirmation on the current queue", async () => {
      serve()
      post.mockReturnValueOnce(
        refuse(409, {
          code: "order_stale",
          message: "Fronta se mezitím změnila. Načtěte ji znovu a přesun zopakujte.",
        }),
      )
      renderSection()

      const dialog = await openMove("Lucie Sedláčková")
      await fill(dialog, /Tereza Nováková/, "Organizační tým")
      await userEvent.click(within(dialog).getByRole("button", { name: "Pokračovat" }))
      await userEvent.click(within(dialog).getByRole("button", { name: "Uložit pořadí" }))

      expect(await within(dialog).findByText("Pořadí nebylo uloženo")).toBeInTheDocument()
      serve(makeTermEvaluation({ inputVersion: 6 }))
      await userEvent.click(within(dialog).getByRole("button", { name: "Načíst aktuální frontu" }))

      // Back at the form with the entry kept; it is sent only after a new confirmation.
      expect(await within(dialog).findByLabelText("Důvod")).toHaveValue("Organizační tým")
      expect(post).toHaveBeenCalledTimes(1)
      post.mockReturnValue(answer(makeTermEvaluation({ inputVersion: 7 })))
      await userEvent.click(within(dialog).getByRole("button", { name: "Pokračovat" }))
      await userEvent.click(within(dialog).getByRole("button", { name: "Uložit pořadí" }))
      await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
      const [path, options] = post.mock.lastCall as [string, { json: { expectedVersion: number } }]
      expect(path).toBe(MOVES)
      expect(options.json.expectedVersion).toBe(6)
    })

    it("closes with an explanation when the reloaded queue no longer has the person", async () => {
      serve()
      post.mockReturnValue(refuse(409, { code: "order_stale" }))
      renderSection()

      const dialog = await openMove("Lucie Sedláčková")
      await fill(dialog, /Tereza Nováková/, "Organizační tým")
      await userEvent.click(within(dialog).getByRole("button", { name: "Pokračovat" }))
      await userEvent.click(within(dialog).getByRole("button", { name: "Uložit pořadí" }))
      await within(dialog).findByText("Pořadí nebylo uloženo")
      const term = makeTermEvaluation()
      serve({ ...term, order: term.order.filter((entry) => entry.firstName !== "Lucie") })
      await userEvent.click(within(dialog).getByRole("button", { name: "Načíst aktuální frontu" }))

      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "Změnit pořadí: Lucie Sedláčková" }),
        ).not.toBeInTheDocument(),
      )
      expect(toastError).toHaveBeenCalledWith(
        "Osobu už v této frontě nelze přesunout. Pořadí se nezměnilo.",
      )
      expect(post).toHaveBeenCalledTimes(1)
    })

    it("keeps the order after a failed write and retries the same move", async () => {
      serve()
      post.mockReturnValueOnce(refuse(500, {}))
      renderSection()

      const dialog = await openMove("Lucie Sedláčková")
      await fill(dialog, /Tereza Nováková/, "Organizační tým")
      await userEvent.click(within(dialog).getByRole("button", { name: "Pokračovat" }))
      await userEvent.click(within(dialog).getByRole("button", { name: "Uložit pořadí" }))

      expect(
        await within(dialog).findByText("Změnu pořadí se nepodařilo uložit"),
      ).toBeInTheDocument()
      expect(within(dialog).getByText("Pořadí zůstává původní.")).toBeInTheDocument()
      post.mockReturnValue(answer(makeTermEvaluation({ inputVersion: 5 })))
      await userEvent.click(within(dialog).getByRole("button", { name: "Uložit pořadí" }))

      await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
      expect(post.mock.calls[1]).toEqual(post.mock.calls[0])
    })

    it("tells a failed history from an empty one", async () => {
      get.mockImplementation((path: string) =>
        path.endsWith("/order/moves")
          ? refuse(500, {})
          : path.endsWith("/runs")
            ? answer({ runs: [] })
            : answer(makeTermEvaluation()),
      )
      renderSection()

      expect(await screen.findByText("Historii se nepodařilo načíst")).toBeInTheDocument()
      expect(screen.queryByText("Historie zatím neobsahuje záznamy")).not.toBeInTheDocument()
    })
  })
})
