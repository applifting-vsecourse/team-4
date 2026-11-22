import { formatCalendarRange, formatPragueDateTime } from "@/lib/date"

import {
  type EventAttribute,
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

/** The built-in gender question (F64), worded as the registration form words it. */
const GENDER: Pick<EventAttribute, "attribute" | "label" | "values"> = {
  attribute: "gender",
  label: "Pohlaví",
  values: [
    { value: "female", label: "Žena" },
    { value: "male", label: "Muž" },
    { value: "other", label: "Jiná odpověď" },
    { value: "undisclosed", label: "Nechci uvést" },
  ],
}

/** Labels of an event's categorical questions and their answers (#485). */
export type AttributeLabels = {
  attribute: (attribute: string) => string
  /** No answer reads "Neuvedeno" (F64). */
  value: (attribute: string, value: string | null) => string
}

/**
 * The labels of gender and of the event's questions (from the attributes of
 * Pravidla ubytování). A question removed since reads "Odstraněná otázka".
 */
export function attributeLabels(
  attributes: readonly Pick<EventAttribute, "attribute" | "label" | "values">[] = [],
): AttributeLabels {
  const known = new Map([GENDER, ...attributes].map((a) => [a.attribute, a]))
  return {
    attribute: (attribute) => known.get(attribute)?.label ?? "Odstraněná otázka",
    value: (attribute, value) =>
      value === null
        ? "Neuvedeno"
        : (known.get(attribute)?.values.find((v) => v.value === value)?.label ?? value),
  }
}

/** Gender's labels alone, where the event's questions do not matter. */
export const GENDER_LABELS = attributeLabels()

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

export function toOrderPeople(
  data: TermEvaluationData,
  labels: AttributeLabels = GENDER_LABELS,
): OrderPerson[] {
  const hard = data.hardAttribute
  return data.order.map((entry) => ({
    id: entry.registrationId,
    position: entry.position,
    name: `${entry.firstName} ${entry.lastName}`,
    receivedAt: formatPragueDateTime(entry.receivedAt),
    answer: hard ? labels.value(hard.attribute, entry.answer) : "",
    determinedAs:
      hard && entry.determinedValue !== null
        ? labels.value(hard.attribute, entry.determinedValue)
        : undefined,
    queueId: hard ? entry.effectiveValue : EVERYONE,
    state: entry.status,
    result: entry.result,
    reason: entry.reason,
    isMovedByHand: entry.isMovedByHand,
  }))
}

export function toQueues(
  data: TermEvaluationData,
  labels: AttributeLabels = GENDER_LABELS,
): TermQueue[] {
  const hard = data.hardAttribute
  return data.queues.map((queue) => ({
    id: queue.value ?? EVERYONE,
    label: hard && queue.value !== null ? labels.value(hard.attribute, queue.value) : "Všichni",
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

export function toConflict(
  data: TermEvaluationData,
  labels: AttributeLabels = GENDER_LABELS,
): EvaluationConflict | undefined {
  if (!data.conflict) return undefined
  const attribute = data.hardAttribute ? labels.attribute(data.hardAttribute.attribute) : null
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
export function queueLabel(
  termLabel: string,
  attribute: string | null,
  queue: string | null,
  labels: AttributeLabels = GENDER_LABELS,
) {
  return `${termLabel} · ${
    attribute && queue !== null ? `fronta ${labels.value(attribute, queue)}` : "fronta všech"
  }`
}

/** A manual change of the order (F39-1); the attribute of the term's rules, if any. */
export const toHistoryMove = (
  move: MoveRecord,
  attribute: string | null,
  labels: AttributeLabels = GENDER_LABELS,
): HistoryMove => ({
  kind: "move",
  id: move.id,
  at: formatPragueDateTime(move.createdAt),
  author: move.actor.name,
  person: `${move.person.firstName} ${move.person.lastName}`,
  queueLabel: queueLabel(move.termLabel, attribute, move.queue, labels),
  fromPosition: move.fromPosition,
  toPosition: move.toPosition,
  reason: move.reason,
})

/** The evidence sheet's content, with the run's own answers and determinations. */
export function toEvidence(run: RunEvidence, labels: AttributeLabels = GENDER_LABELS) {
  const hard = run.hardAttribute
  const order: EvidencePerson[] = run.order.map((person) => ({
    id: person.registrationId,
    position: person.position ?? 0,
    name: `${person.firstName} ${person.lastName}`,
    receivedAt: formatPragueDateTime(person.receivedAt),
    answer: hard ? labels.value(hard.attribute, person.answer) : "",
    determinedAs:
      hard && person.manualValue !== null
        ? labels.value(hard.attribute, person.manualValue)
        : undefined,
    result: person.result,
    reason: person.reason,
  }))
  return {
    runLabel: `${run.termLabel} · ${formatPragueDateTime(run.finishedAt)}`,
    startedBy: run.triggeredBy?.name ?? "Automaticky",
    solverVersion: run.solverVersion,
    rules: hard && {
      attribute: labels.attribute(hard.attribute),
      nonDetermining: hard.nonDeterminingValues.map((value) => labels.value(hard.attribute, value)),
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
