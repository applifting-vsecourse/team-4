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
    // Everyone can be decided; moving in the order comes with a later slice.
    expect(screen.getByRole("button", { name: "Potvrdit všechny vhodné (3)" })).toBeEnabled()
    expect(within(order).getAllByRole("button", { name: /^Akce:/ })).toHaveLength(5)
    await userEvent.click(within(order).getByRole("button", { name: "Akce: Alex Šimek" }))
    expect(await screen.findByRole("menuitem", { name: "Určit ubytování" })).toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: "Změnit pořadí" })).not.toBeInTheDocument()
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
        decisions: [],
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

  describe("Potvrdit všechny vhodné", () => {
    const CONFIRM_PATH = `organizations/org/events/event/accommodation/terms/${EVALUATED_TERM.id}/confirmations`
    const confirmed = [
      {
        registrationId: "0190c0de-0000-7000-8000-000000000601",
        firstName: "Tereza",
        lastName: "Nováková",
      },
      {
        registrationId: "0190c0de-0000-7000-8000-000000000602",
        firstName: "Jakub",
        lastName: "Svoboda",
      },
      {
        registrationId: "0190c0de-0000-7000-8000-000000000604",
        firstName: "Anna",
        lastName: "Procházková",
      },
    ]

    it("shows the term and the people, then confirms the proposal once", async () => {
      serve()
      post.mockReturnValue(answer({ confirmed, isReplay: false }))
      renderSection()

      await userEvent.click(
        await screen.findByRole("button", { name: "Potvrdit všechny vhodné (3)" }),
      )
      const dialog = await screen.findByRole("dialog", { name: "Potvrdit všechny vhodné" })
      expect(within(dialog).getByText(/Turnus 1/)).toBeInTheDocument()
      expect(
        within(dialog)
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual(["Tereza Nováková", "Jakub Svoboda", "Anna Procházková"])
      expect(within(dialog).getByText(/1 neubytovatelní, 1 ruční určení/)).toBeInTheDocument()

      await userEvent.click(within(dialog).getByRole("button", { name: "Potvrdit 3 účasti" }))

      await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
      expect(post).toHaveBeenCalledWith(CONFIRM_PATH, {
        json: {
          runId: makeTermEvaluation().proposalRun!.id,
          submissionKey: expect.any(String) as string,
        },
      })
      expect(await screen.findByText("Potvrzeno 3 účasti v termínu Turnus 1.")).toBeInTheDocument()
      expect(
        screen.queryByRole("dialog", { name: "Potvrdit všechny vhodné" }),
      ).not.toBeInTheDocument()
    })

    it("explains an old proposal, confirms nobody and offers the current one", async () => {
      serve()
      post.mockReturnValue(
        refuse(409, {
          code: "proposal_stale",
          message: "Podklady se změnily. Nikdo nebyl potvrzen, načtěte aktuální návrh.",
        }),
      )
      renderSection()

      await userEvent.click(
        await screen.findByRole("button", { name: "Potvrdit všechny vhodné (3)" }),
      )
      await userEvent.click(await screen.findByRole("button", { name: "Potvrdit 3 účasti" }))

      expect(
        await screen.findByText("Návrh je neaktuální, nikdo nebyl potvrzen"),
      ).toBeInTheDocument()
      expect(screen.getByText(/Nikdo nebyl potvrzen, načtěte/)).toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: "Načíst nový návrh" }))
      expect(
        screen.queryByRole("dialog", { name: "Potvrdit všechny vhodné" }),
      ).not.toBeInTheDocument()
    })

    it("keeps the confirmation retryable after a failed write", async () => {
      serve()
      post
        .mockReturnValueOnce(refuse(500, {}))
        .mockReturnValueOnce(answer({ confirmed, isReplay: true }))
      renderSection()

      await userEvent.click(
        await screen.findByRole("button", { name: "Potvrdit všechny vhodné (3)" }),
      )
      await userEvent.click(await screen.findByRole("button", { name: "Potvrdit 3 účasti" }))
      expect(await screen.findByText("Potvrzení se nepodařilo uložit")).toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Potvrdit 3 účasti" }))
      await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
      // The retry is the same request, so it is saved once.
      expect(post.mock.calls[1]?.[1]).toEqual(post.mock.calls[0]?.[1])
    })
  })

  describe("deciding one person", () => {
    const DECISION_PATH = (n: number) =>
      `organizations/org/events/event/accommodation/terms/${EVALUATED_TERM.id}/registrations/0190c0de-0000-7000-8000-000000000${n}/decision`

    it("waitlists a pending person without asking for a value", async () => {
      serve()
      post.mockReturnValue(answer({ status: "waitlisted" }))
      renderSection()

      await userEvent.click(await screen.findByRole("button", { name: "Akce: Lucie Sedláčková" }))
      await userEvent.click(
        await screen.findByRole("menuitem", { name: "Zařadit mezi náhradníky" }),
      )
      const dialog = await screen.findByRole("dialog", { name: "Zařadit mezi náhradníky" })
      expect(within(dialog).queryByLabelText("Důvod")).not.toBeInTheDocument()
      await userEvent.click(within(dialog).getByRole("button", { name: "Zařadit mezi náhradníky" }))

      await waitFor(() =>
        expect(post).toHaveBeenCalledWith(DECISION_PATH(605), {
          json: { decision: "waitlist", submissionKey: expect.any(String) as string },
        }),
      )
    })

    it("confirms a person who needs a value together with the determination", async () => {
      serve()
      post.mockReturnValue(answer({ status: "confirmed" }))
      renderSection()

      await userEvent.click(await screen.findByRole("button", { name: "Akce: Alex Šimek" }))
      await userEvent.click(await screen.findByRole("menuitem", { name: "Potvrdit účast" }))
      const dialog = await screen.findByRole("dialog", { name: "Potvrdit účast" })

      // Nothing is sent without the value and the reason.
      await userEvent.click(within(dialog).getByRole("button", { name: "Potvrdit účast" }))
      expect(await within(dialog).findByText("Vyberte hodnotu.")).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()

      await userEvent.click(within(dialog).getByRole("combobox"))
      await userEvent.click(await screen.findByRole("option", { name: "Muž" }))
      await userEvent.type(within(dialog).getByLabelText("Důvod"), "Domluva s rodiči")
      await userEvent.click(within(dialog).getByRole("button", { name: "Potvrdit účast" }))

      await waitFor(() =>
        expect(post).toHaveBeenCalledWith(DECISION_PATH(603), {
          json: {
            decision: "confirm",
            submissionKey: expect.any(String) as string,
            determination: { value: "male", reason: "Domluva s rodiči", answer: "undisclosed" },
          },
        }),
      )
    })

    it("explains a decision the capacity refused", async () => {
      serve()
      post.mockReturnValue(
        refuse(409, {
          code: "no_capacity",
          message: "V termínu není dost volné kapacity, účast nebyla potvrzena.",
        }),
      )
      renderSection()

      await userEvent.click(await screen.findByRole("button", { name: "Akce: Lucie Sedláčková" }))
      await userEvent.click(await screen.findByRole("menuitem", { name: "Potvrdit účast" }))
      const dialog = await screen.findByRole("dialog", { name: "Potvrdit účast" })
      await userEvent.click(within(dialog).getByRole("button", { name: "Potvrdit účast" }))

      expect(await within(dialog).findByText("Účast nebyla potvrzena")).toBeInTheDocument()
      expect(
        within(dialog).getByText("V termínu není dost volné kapacity, účast nebyla potvrzena."),
      ).toBeInTheDocument()
    })
  })
})
