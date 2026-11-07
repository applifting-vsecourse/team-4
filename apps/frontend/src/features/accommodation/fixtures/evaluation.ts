import { z } from "zod"

import {
  moveRecordSchema,
  registrationAccommodationSchema,
  runEvidenceSchema,
  runListSchema,
  termEvaluationSchema,
  type MoveRecord,
  type RegistrationAccommodation,
  type RunEvidence,
  type RunListItem,
  type TermEvaluationData,
} from "@/features/accommodation/api/evaluationSchemas"

// Preview and test data for the term evaluation (S3-01). Every factory parses
// its result with the API schema; values are fixed so stories render the same
// every time. The term is Turnus 1 of the open summer camp fixture.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

export const EVALUATED_TERM = {
  id: uuid(101),
  label: "Turnus 1",
  startDate: "2027-07-04",
  endDate: "2027-07-17",
}

const RUN_ID = uuid(701)
const OWNER = { id: "organizer-1", name: "Marie Králová" }

type Person = [
  n: number,
  first: string,
  last: string,
  answer: string | null,
  status: "pending" | "waitlisted",
]

const PEOPLE: Person[] = [
  [601, "Tereza", "Nováková", "female", "pending"],
  [602, "Jakub", "Svoboda", "male", "pending"],
  [603, "Alex", "Šimek", "undisclosed", "pending"],
  [604, "Anna", "Procházková", "female", "waitlisted"],
  [605, "Lucie", "Sedláčková", "female", "pending"],
]

const RESULTS: Record<
  number,
  { result: "suitable" | "unsuitable" | "manual"; reason?: "A" | "R" }
> = {
  601: { result: "suitable" },
  602: { result: "suitable" },
  603: { result: "manual", reason: "R" },
  604: { result: "suitable" },
  605: { result: "unsuitable", reason: "A" },
}

export function makeTermEvaluation(
  overrides: Partial<TermEvaluationData> = {},
): TermEvaluationData {
  return termEvaluationSchema.parse({
    mode: "automatic",
    term: EVALUATED_TERM,
    hardAttribute: {
      attribute: "gender",
      nonDeterminingValues: ["other", "undisclosed"],
      determiningValues: ["female", "male"],
    },
    hasRooms: true,
    status: "current",
    inputVersion: 4,
    scheduledAt: null,
    proposalRun: { id: RUN_ID, finishedAt: "2027-03-10T13:32:00.000Z", isCurrent: true },
    conflict: null,
    capacity: {
      baseBeds: 6,
      extraBeds: 1,
      confirmed: 3,
      pending: 4,
      waitlisted: 1,
      proposal: { suitable: 3, unsuitable: 1, manual: 1, baseUsed: 6, extraUsed: 0 },
    },
    queues: [
      { value: "female", pending: 2, waitlisted: 1, suitable: 2, unsuitable: 1 },
      { value: "male", pending: 1, waitlisted: 0, suitable: 1, unsuitable: 0 },
    ],
    manualCount: 1,
    order: PEOPLE.map(([n, firstName, lastName, answer, status], index) => ({
      registrationId: uuid(n),
      firstName,
      lastName,
      receivedAt: `2027-03-0${index + 1}T09:14:00.000Z`,
      status,
      position: index + 1,
      answer,
      determinedValue: null,
      effectiveValue: answer === "undisclosed" ? null : answer,
      // Anna was placed before Lucie by hand (see makeMoves).
      isMovedByHand: n === 604,
      ...RESULTS[n],
    })),
    ...overrides,
  })
}

/** The same term before its first evaluation: no proposal, no results. */
export function makeUnevaluatedTerm(): TermEvaluationData {
  const term = makeTermEvaluation()
  return termEvaluationSchema.parse({
    ...term,
    status: "none",
    proposalRun: null,
    capacity: { ...term.capacity, proposal: undefined },
    queues: term.queues.map(({ value, pending, waitlisted }) => ({ value, pending, waitlisted })),
    order: term.order.map(({ result: _result, reason: _reason, ...person }) => person),
  })
}

export function makeRuns(): RunListItem[] {
  return runListSchema.parse({
    runs: [
      {
        id: RUN_ID,
        status: "solved",
        startedAt: "2027-03-10T13:31:58.000Z",
        finishedAt: "2027-03-10T13:32:00.000Z",
        triggeredBy: null,
        inputVersion: 4,
        isCurrent: true,
        summary: { suitable: 3, unsuitable: 1, manual: 1 },
      },
      {
        id: uuid(700),
        status: "solved",
        startedAt: "2027-03-09T08:00:00.000Z",
        finishedAt: "2027-03-09T08:00:01.000Z",
        triggeredBy: OWNER,
        inputVersion: 2,
        isCurrent: false,
        summary: { suitable: 2, unsuitable: 0, manual: 1 },
      },
    ],
  }).runs
}

/** Anna placed right before Lucie in the queue Žena, before the last run. */
export function makeMoves(): MoveRecord[] {
  return z.array(moveRecordSchema).parse([
    {
      id: uuid(951),
      createdAt: "2027-03-10T13:20:00.000Z",
      actor: OWNER,
      reason: "Sestra potvrzené účastnice, rodina žádá společný turnus.",
      termId: EVALUATED_TERM.id,
      termLabel: EVALUATED_TERM.label,
      person: { registrationId: uuid(604), firstName: "Anna", lastName: "Procházková" },
      queue: "female",
      placement: "before",
      target: { registrationId: uuid(605), firstName: "Lucie", lastName: "Sedláčková" },
      fromPosition: 5,
      toPosition: 4,
      inputVersion: 3,
    },
  ])
}

export function makeRunEvidence(): RunEvidence {
  const term = makeTermEvaluation()
  return runEvidenceSchema.parse({
    ...makeRuns()[0],
    termId: EVALUATED_TERM.id,
    termLabel: EVALUATED_TERM.label,
    solverVersion: "highs-phase1/1",
    hardAttribute: term.hardAttribute,
    rooms: [
      { roomId: uuid(801), label: "Chatka Sova", baseBeds: 4, extraBeds: 1 },
      { roomId: uuid(802), label: "Chatka Liška", baseBeds: 2, extraBeds: 0 },
    ],
    confirmed: [],
    isOrderManual: false,
    order: term.order.map((person) => ({
      registrationId: person.registrationId,
      firstName: person.firstName,
      lastName: person.lastName,
      receivedAt: person.receivedAt,
      answer: person.answer,
      manualValue: null,
      effectiveValue: person.effectiveValue,
      position: person.position,
      result: person.result,
      reason: person.reason,
    })),
    error: null,
  })
}

/** A registration answered "Nechci uvést", determined as Žena for every term. */
export function makeRegistrationAccommodation(
  overrides: Partial<RegistrationAccommodation> = {},
): RegistrationAccommodation {
  return registrationAccommodationSchema.parse({
    hardAttribute: makeTermEvaluation().hardAttribute,
    answer: "undisclosed",
    determination: {
      value: "female",
      basedOnAnswer: "undisclosed",
      reason: "Domluva s rodiči, chce bydlet s kamarádkami z oddílu.",
      createdAt: "2027-03-10T13:31:00.000Z",
      createdBy: OWNER,
      isValid: true,
    },
    effectiveValue: "female",
    needsDetermination: false,
    decisions: [],
    history: [
      {
        id: uuid(901),
        createdAt: "2027-03-10T13:31:00.000Z",
        actor: OWNER,
        reason: "Domluva s rodiči, chce bydlet s kamarádkami z oddílu.",
        answer: "undisclosed",
        previousValue: null,
        value: "female",
      },
    ],
    moves: [],
    ...overrides,
  })
}
