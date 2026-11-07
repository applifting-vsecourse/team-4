import { formatCalendarRange, formatPragueDateTime } from "@/lib/date"

import {
  type MoveRecord,
  type RunEvidence,
  type RunListItem,
  type TermEvaluationData,
} from "@/features/accommodation/api/evaluationSchemas"
import {
  type HistoryMove,
  type HistoryRun,
} from "@/features/accommodation/components/EvaluationHistory"
import { type EvidencePerson } from "@/features/accommodation/components/RunEvidenceSheet"
import { type TermCapacity } from "@/features/accommodation/components/TermCapacitySummary"
import {
  type EvaluationConflict,
  type EvaluationTerm,
  type OrderPerson,
} from "@/features/accommodation/components/TermEvaluation"
import { type TermQueue } from "@/features/accommodation/components/TermQueues"

// The term evaluation API (S3-01) worded for the design components: labels of
// the hard attribute and its values, the order, the queues and the history.

/** The queue of everyone when the event has no hard attribute. */
export const EVERYONE = "everyone"

/** The queue tab of the people waiting for a manual determination. */
export const MANUAL = "manual"

const ATTRIBUTE_LABELS: Record<string, string> = { gender: "Pohlaví" }

/** The answers of the gender preset (F64), worded as the registration form words them. */
const GENDER_VALUE_LABELS: Record<string, string> = {
  female: "Žena",
  male: "Muž",
  other: "Jiná odpověď",
  undisclosed: "Nechci uvést",
}

export const attributeLabel = (attribute: string) => ATTRIBUTE_LABELS[attribute] ?? attribute

/** An answer or a value of the hard attribute; no answer reads "Neuvedeno" (F64). */
export function valueLabel(attribute: string, value: string | null) {
  if (value === null) return "Neuvedeno"
  if (attribute === "gender") return GENDER_VALUE_LABELS[value] ?? value
  return value
}

export const toEvaluationTerm = (term: {
  id: string
  label: string
  startDate: string
  endDate: string
}): EvaluationTerm => ({
  id: term.id,
  label: term.label,
  dates: formatCalendarRange(term.startDate, term.endDate),
})

export function toOrderPeople(data: TermEvaluationData): OrderPerson[] {
  const hard = data.hardAttribute
  return data.order.map((entry) => ({
    id: entry.registrationId,
    position: entry.position,
    name: `${entry.firstName} ${entry.lastName}`,
    receivedAt: formatPragueDateTime(entry.receivedAt),
    answer: hard ? valueLabel(hard.attribute, entry.answer) : "",
    determinedAs:
      hard && entry.determinedValue !== null
        ? valueLabel(hard.attribute, entry.determinedValue)
        : undefined,
    queueId: hard ? entry.effectiveValue : EVERYONE,
    state: entry.status,
    result: entry.result,
    reason: entry.reason,
    isMovedByHand: entry.isMovedByHand,
  }))
}

export function toQueues(data: TermEvaluationData): TermQueue[] {
  const hard = data.hardAttribute
  return data.queues.map((queue) => ({
    id: queue.value ?? EVERYONE,
    label: hard && queue.value !== null ? valueLabel(hard.attribute, queue.value) : "Všichni",
    pending: queue.pending,
    waitlisted: queue.waitlisted,
    suitable: queue.suitable,
    unsuitable: queue.unsuitable,
  }))
}

export const toCapacity = (data: TermEvaluationData): TermCapacity => ({
  ...data.capacity,
  hasRooms: data.hasRooms,
})

const CONSTRAINTS: Record<
  NonNullable<TermEvaluationData["conflict"]>["constraint"],
  (attribute: string | null) => string
> = {
  capacity: () => "Kapacita: potvrzených je víc, než je dostupných lůžek.",
  homogeneity: (attribute) =>
    `Homogenita: potvrzení se podle hodnoty „${attribute ?? "tvrdého atributu"}“ nevejdou do dostupných pokojů.`,
}

export function toConflict(data: TermEvaluationData): EvaluationConflict | undefined {
  if (!data.conflict) return undefined
  const attribute = data.hardAttribute ? attributeLabel(data.hardAttribute.attribute) : null
  return {
    constraint: CONSTRAINTS[data.conflict.constraint](attribute),
    confirmed: data.conflict.confirmed.map((person) => `${person.firstName} ${person.lastName}`),
  }
}

const runSummary = (run: RunListItem): string | undefined =>
  run.summary
    ? `Vhodní ${run.summary.suitable} · neubytovatelní ${run.summary.unsuitable} · ruční určení ${run.summary.manual}`
    : undefined

export const toHistoryRun = (run: RunListItem, termLabel: string): HistoryRun => ({
  kind: "run",
  id: run.id,
  at: formatPragueDateTime(run.finishedAt),
  author: run.triggeredBy?.name ?? "Automaticky",
  termLabel,
  status: run.status,
  summary: runSummary(run),
})

/** E.g. "1. turnus · fronta Žena"; "fronta všech" without a hard attribute. */
export function queueLabel(termLabel: string, attribute: string | null, queue: string | null) {
  return `${termLabel} · ${
    attribute && queue !== null ? `fronta ${valueLabel(attribute, queue)}` : "fronta všech"
  }`
}

/** A manual change of the order (F39-1); the attribute of the term's rules, if any. */
export const toHistoryMove = (move: MoveRecord, attribute: string | null): HistoryMove => ({
  kind: "move",
  id: move.id,
  at: formatPragueDateTime(move.createdAt),
  author: move.actor.name,
  person: `${move.person.firstName} ${move.person.lastName}`,
  queueLabel: queueLabel(move.termLabel, attribute, move.queue),
  fromPosition: move.fromPosition,
  toPosition: move.toPosition,
  reason: move.reason,
})

/** The evidence sheet's content, with the run's own answers and determinations. */
export function toEvidence(run: RunEvidence) {
  const hard = run.hardAttribute
  const order: EvidencePerson[] = run.order.map((person) => ({
    id: person.registrationId,
    position: person.position ?? 0,
    name: `${person.firstName} ${person.lastName}`,
    receivedAt: formatPragueDateTime(person.receivedAt),
    answer: hard ? valueLabel(hard.attribute, person.answer) : "",
    determinedAs:
      hard && person.manualValue !== null
        ? valueLabel(hard.attribute, person.manualValue)
        : undefined,
    result: person.result,
    reason: person.reason,
  }))
  return {
    runLabel: `${run.termLabel} · ${formatPragueDateTime(run.finishedAt)}`,
    startedBy: run.triggeredBy?.name ?? "Automaticky",
    solverVersion: run.solverVersion,
    rules: hard && {
      attribute: attributeLabel(hard.attribute),
      nonDetermining: hard.nonDeterminingValues.map((value) => valueLabel(hard.attribute, value)),
    },
    rooms: run.rooms.map((room) => ({
      id: room.roomId,
      label: room.label,
      baseBeds: room.baseBeds,
      extraBeds: room.extraBeds,
    })),
    confirmedCount: run.confirmed.length,
    isOrderManual: run.isOrderManual,
    order,
    outcome: evidenceOutcome(run),
  }
}

/** The run's end when it produced no proposal. */
function evidenceOutcome(run: RunEvidence): string | undefined {
  switch (run.status) {
    case "solved":
      return undefined
    case "timeout":
      return "Výpočet nedoběhl v časovém limitu, návrh nevznikl."
    case "failed":
      return `Výpočet se nezdařil${run.error ? `: ${run.error}` : "."}`
    case "infeasible": {
      const names = run.conflict?.confirmed.map((p) => `${p.firstName} ${p.lastName}`) ?? []
      return `Potvrzení účastníci se nevejdou do dostupných pokojů${names.length ? ` (${names.join(", ")})` : ""}.`
    }
  }
}
