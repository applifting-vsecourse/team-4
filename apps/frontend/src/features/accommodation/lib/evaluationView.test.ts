import { describe, expect, it } from "vitest"

import { makeRunEvidence, makeTermEvaluation } from "@/features/accommodation/fixtures/evaluation"
import {
  EVERYONE,
  toConflict,
  toEvidence,
  toHistoryRun,
  toOrderPeople,
  toQueues,
  valueLabel,
} from "@/features/accommodation/lib/evaluationView"

describe("evaluationView", () => {
  it("words the answers, keeps who needs a determination out of the queues", () => {
    const people = toOrderPeople(makeTermEvaluation())
    expect(people.map(({ name, answer, queueId }) => [name, answer, queueId])).toEqual([
      ["Tereza Nováková", "Žena", "female"],
      ["Jakub Svoboda", "Muž", "male"],
      ["Alex Šimek", "Nechci uvést", null],
      ["Anna Procházková", "Žena", "female"],
      ["Lucie Sedláčková", "Žena", "female"],
    ])
    expect(people[2]).toMatchObject({ result: "manual", reason: "R" })
  })

  it("names a determination and reads no answer as Neuvedeno", () => {
    const data = makeTermEvaluation()
    const determined = makeTermEvaluation({
      order: [{ ...data.order[2]!, answer: null, determinedValue: "male", effectiveValue: "male" }],
    })
    expect(toOrderPeople(determined)[0]).toMatchObject({
      answer: "Neuvedeno",
      determinedAs: "Muž",
      queueId: "male",
    })
    expect(valueLabel("gender", null)).toBe("Neuvedeno")
  })

  it("puts everyone into one queue without a hard attribute", () => {
    const data = makeTermEvaluation({
      hardAttribute: null,
      queues: [{ value: null, pending: 4, waitlisted: 1 }],
    })
    expect(toQueues(data)).toEqual([{ id: EVERYONE, label: "Všichni", pending: 4, waitlisted: 1 }])
    expect(toOrderPeople(data).every((person) => person.queueId === EVERYONE)).toBe(true)
  })

  it("words a conflict with the confirmed participants it names", () => {
    const conflict = toConflict(
      makeTermEvaluation({
        status: "infeasible",
        conflict: {
          constraint: "homogeneity",
          confirmed: [
            {
              registrationId: "0190c0de-0000-7000-8000-000000000611",
              firstName: "Eva",
              lastName: "Malá",
            },
          ],
        },
      }),
    )
    expect(conflict).toEqual({
      constraint: "Homogenita: potvrzení se podle hodnoty „Pohlaví“ nevejdou do dostupných pokojů.",
      confirmed: ["Eva Malá"],
    })
  })

  it("names the author of a run, or the system", () => {
    const run = {
      id: "0190c0de-0000-7000-8000-000000000701",
      status: "solved" as const,
      startedAt: "2027-03-10T13:31:58.000Z",
      finishedAt: "2027-03-10T13:32:00.000Z",
      triggeredBy: null,
      inputVersion: 1,
      isCurrent: true,
      summary: { suitable: 3, unsuitable: 1, manual: 0 },
    }
    expect(toHistoryRun(run, "Turnus 1")).toMatchObject({
      author: "Automaticky",
      summary: "Vhodní 3 · neubytovatelní 1 · ruční určení 0",
    })
    expect(
      toHistoryRun({ ...run, triggeredBy: { id: "u", name: "Marie Králová" } }, "Turnus 1").author,
    ).toBe("Marie Králová")
  })

  it("invents no result for a run that produced no proposal, and says how it ended", () => {
    const failed = {
      ...makeRunEvidence(),
      status: "failed" as const,
      summary: null,
      error: "solver crashed",
      order: makeRunEvidence().order.map(({ result: _r, reason: _s, ...person }) => person),
    }
    const evidence = toEvidence(failed)
    expect(evidence.order.every((person) => person.result === undefined)).toBe(true)
    expect(evidence.outcome).toBe("Výpočet se nezdařil: solver crashed")
    expect(toEvidence(makeRunEvidence()).outcome).toBeUndefined()
  })
})
