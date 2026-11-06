import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrganizerEventPage } from "@/screens/designs/OrganizerEventPage"

import {
  BulkConfirmationDialog,
  type BulkConfirmationState,
} from "@/features/accommodation/components/BulkConfirmationDialog"
import {
  EvaluationHistory,
  type HistoryEntry,
} from "@/features/accommodation/components/EvaluationHistory"
import { ManualDeterminationDialog } from "@/features/accommodation/components/ManualDeterminationDialog"
import {
  QueueMoveDialog,
  type QueueMoveDialogProps,
} from "@/features/accommodation/components/QueueMoveDialog"
import {
  RunEvidenceSheet,
  type EvidencePerson,
} from "@/features/accommodation/components/RunEvidenceSheet"
import { TermDecisionDialog } from "@/features/accommodation/components/TermDecisionDialog"
import {
  TermEvaluation,
  type EvaluationTerm,
  type OrderPerson,
  type TermEvaluationProps,
} from "@/features/accommodation/components/TermEvaluation"
import { reasonText } from "@/features/accommodation/lib/proposal"

// Design of the term evaluation: Přihlášky → Vyhodnocení → vybraný termín.
// One screen for F13-1 (proposal, status, recalculation), F14-1 (bulk and
// individual decisions), F16-1 (queues per room type), F17-1 (capacity of the
// term) and F39-1 (order, moves with a reason, history and run evidence). The
// data follow what the S3-T4 solver returns (spec v4 §7, §8): rooms are
// homogeneous in Pohlaví, extra beds fill last, reasons A, B, C, N and R.
// Static only: no router, queries or API; every value is hard-coded.

const TERMS: EvaluationTerm[] = [
  { id: "turnus-1", label: "1. turnus", dates: "4.–11. 7. 2027" },
  { id: "turnus-2", label: "2. turnus", dates: "11.–18. 7. 2027" },
  { id: "turnus-3", label: "3. turnus", dates: "18.–25. 7. 2027" },
]

const ATTRIBUTE = "Pohlaví"

type Row = [
  name: string,
  receivedAt: string,
  answer: string,
  queueId: string | null,
  state: OrderPerson["state"],
  result: NonNullable<OrderPerson["result"]>,
  reason?: OrderPerson["reason"],
]

// 1. turnus: 20 beds + 2 extra beds, 9 confirmed (5 Žena, 4 Muž). Women's rooms
// hold 12 and men's 10 by homogeneity, so 7 women and 6 men fit; 3 women
// wait (reason A) and 2 people need a manual determination (reason R).
const ROWS: Row[] = [
  ["Tereza Nováková", "3. 3. 2027 9:14", "Žena", "zena", "pending", "suitable"],
  ["Jakub Svoboda", "3. 3. 2027 9:20", "Muž", "muz", "pending", "suitable"],
  ["Eliška Dvořáková", "4. 3. 2027 16:02", "Žena", "zena", "pending", "suitable"],
  ["Alex Šimek", "3. 3. 2027 11:47", "Nechci uvést", null, "pending", "manual", "R"],
  ["Anna Procházková", "3. 3. 2027 12:05", "Žena", "zena", "waitlisted", "suitable"],
  ["Matěj Černý", "3. 3. 2027 13:30", "Muž", "muz", "pending", "suitable"],
  ["Klára Veselá", "3. 3. 2027 18:12", "Žena", "zena", "pending", "suitable"],
  ["Ondřej Horák", "4. 3. 2027 7:55", "Muž", "muz", "pending", "suitable"],
  ["Vojtěch Kučera", "4. 3. 2027 8:31", "Muž", "muz", "waitlisted", "suitable"],
  ["Barbora Kratochvílová", "4. 3. 2027 10:09", "Jiná odpověď", "zena", "pending", "suitable"],
  ["Natálie Marková", "5. 3. 2027 19:44", "Žena", "zena", "pending", "suitable"],
  ["Filip Němec", "6. 3. 2027 8:03", "Muž", "muz", "pending", "suitable"],
  ["Adéla Havlíčková", "6. 3. 2027 21:17", "Žena", "zena", "pending", "suitable"],
  ["Lucie Sedláčková", "7. 3. 2027 9:40", "Žena", "zena", "pending", "unsuitable", "A"],
  ["Robin Malý", "7. 3. 2027 12:26", "Neuvedeno", null, "pending", "manual", "R"],
  ["Kristýna Pokorná", "8. 3. 2027 15:51", "Žena", "zena", "waitlisted", "unsuitable", "A"],
  ["Sára Benešová", "9. 3. 2027 10:12", "Žena", "zena", "pending", "unsuitable", "A"],
  ["Šimon Pospíšil", "9. 3. 2027 17:38", "Muž", "muz", "waitlisted", "suitable"],
]

const PEOPLE: OrderPerson[] = ROWS.map(
  ([name, receivedAt, answer, queueId, state, result, reason], index) => ({
    id: `p-${index + 1}`,
    position: index + 1,
    name,
    receivedAt,
    answer,
    queueId,
    state,
    result,
    reason,
    // Eliška was moved from 6th to 3rd place; Barbora counts as Žena by determination.
    isMovedByHand: index === 2,
    determinedAs: index === 9 ? "Žena" : undefined,
  }),
)

/** An unsuitable person of a small example term. */
function waiting(
  id: string,
  position: number,
  name: string,
  answer: string,
  queueId: string,
  state: OrderPerson["state"],
  reason: OrderPerson["reason"],
): OrderPerson {
  return {
    id,
    position,
    name,
    receivedAt: `${position + 1}. 3. 2027 10:00`,
    answer,
    queueId,
    state,
    result: "unsuitable",
    reason,
  }
}

/** The same people without a valid result (conflict, never evaluated). */
const WITHOUT_RESULT: OrderPerson[] = PEOPLE.map((person) => ({
  ...person,
  result: undefined,
  reason: undefined,
}))

const QUEUES: TermEvaluationProps["queues"] = [
  { id: "zena", label: "Žena", pending: 8, waitlisted: 2, suitable: 7, unsuitable: 3 },
  { id: "muz", label: "Muž", pending: 4, waitlisted: 2, suitable: 6, unsuitable: 0 },
]

const QUEUES_WITHOUT_RESULT = QUEUES.map(({ suitable: _s, unsuitable: _u, ...queue }) => queue)

const CAPACITY: TermEvaluationProps["capacity"] = {
  confirmed: 9,
  pending: 14,
  waitlisted: 4,
  hasRooms: true,
  baseBeds: 20,
  extraBeds: 2,
  proposal: { suitable: 13, unsuitable: 3, manual: 2, baseUsed: 20, extraUsed: 2 },
}

const HISTORY: HistoryEntry[] = [
  {
    id: "h-7",
    kind: "run",
    at: "dnes 14:32",
    author: "Automaticky",
    termLabel: "1. turnus",
    status: "solved",
    summary: "13 vhodných · 3 neubytovatelní · 2 ruční určení",
  },
  {
    id: "h-6",
    kind: "determination",
    at: "dnes 14:31",
    author: "Marie Králová",
    person: "Barbora Kratochvílová",
    answer: "Jiná odpověď",
    value: "Žena",
    reason: "Domluva s rodiči, chce bydlet s kamarádkami z oddílu.",
  },
  {
    id: "h-5",
    kind: "move",
    at: "dnes 14:20",
    author: "Marie Králová",
    person: "Eliška Dvořáková",
    queueLabel: "1. turnus · fronta Žena",
    fromPosition: 6,
    toPosition: 3,
    reason: "Instruktorka oddílu, přihlášku poslala pozdě kvůli chybě v e-mailu.",
  },
  {
    id: "h-4",
    kind: "decision",
    at: "dnes 9:12",
    author: "Marie Králová",
    person: "Vojtěch Kučera",
    termLabel: "1. turnus",
    fromState: "Čeká na rozhodnutí",
    toState: "Náhradník",
    basis: "Jednotlivé rozhodnutí",
  },
  {
    id: "h-3",
    kind: "bulk",
    at: "včera 18:10",
    author: "Marie Králová",
    termLabel: "1. turnus",
    count: 9,
    basis: "Návrh z včera 18:02",
  },
  {
    id: "h-2",
    kind: "run",
    at: "včera 18:02",
    author: "Marie Králová",
    termLabel: "1. turnus",
    status: "solved",
    summary: "9 vhodných · 0 neubytovatelných · 1 ruční určení",
  },
]

const BASE: TermEvaluationProps = {
  terms: TERMS,
  selectedTermId: "turnus-1",
  mode: "automatic",
  status: "current",
  evaluatedAt: "dnes 14:32",
  attribute: ATTRIBUTE,
  capacity: CAPACITY,
  queues: QUEUES,
  people: PEOPLE,
}

const SUITABLE_NAMES = PEOPLE.filter((person) => person.result === "suitable").map(
  (person) => person.name,
)

const ZENA_QUEUE = PEOPLE.filter((person) => person.queueId === "zena")

const MOVE: Omit<QueueMoveDialogProps, "step"> = {
  isOpen: true,
  personId: "p-17",
  personName: "Sára Benešová",
  queueLabel: "1. turnus · fronta Žena",
  targets: ZENA_QUEUE.filter((person) => person.id !== "p-17").map((person) => ({
    id: person.id,
    label: `${person.position}. ${person.name}`,
  })),
  placement: "before",
  targetId: "p-14",
  reason: "Sestra potvrzené účastnice Petry Benešové, rodina žádá společný turnus.",
  originalOrder: ZENA_QUEUE.map((person) => ({ id: person.id, label: person.name })),
  newOrder: [...ZENA_QUEUE.slice(0, 7), ZENA_QUEUE[9], ZENA_QUEUE[7], ZENA_QUEUE[8]].flatMap(
    (person) => (person ? [{ id: person.id, label: person.name }] : []),
  ),
}

const EVIDENCE_ORDER: EvidencePerson[] = PEOPLE.map((person) => ({
  id: person.id,
  position: person.position,
  name: person.name,
  receivedAt: `${person.receivedAt}:0${person.position % 10}.${100 + person.position * 7}`,
  answer: person.answer,
  determinedAs: person.determinedAs,
  result: person.result ?? "manual",
  reason: person.reason,
}))

// The Přihlášky page with its tabs; the evaluation is the new third one.
function Screen({ children }: { children: ReactNode }) {
  return (
    <OrganizerEventPage
      section="Přihlášky"
      crumbs={["Přihlášky"]}
    >
      <Tabs value="evaluation">
        <TabsList aria-label="Přihlášky">
          <TabsTrigger value="list">Seznam přihlášek</TabsTrigger>
          <TabsTrigger value="changes">Ke schválení</TabsTrigger>
          <TabsTrigger value="evaluation">Vyhodnocení</TabsTrigger>
        </TabsList>
        <TabsContent value="evaluation">{children}</TabsContent>
      </Tabs>
    </OrganizerEventPage>
  )
}

/** The whole design: the decisions of the later slices are offered too. */
const ALL_DECISIONS: TermEvaluationProps["decisions"] = {
  onConfirm: () => undefined,
  onWaitlist: () => undefined,
  onDetermine: () => undefined,
  onMove: () => undefined,
}

function evaluation(props: Partial<TermEvaluationProps> = {}, overlay?: ReactNode): ReactNode {
  return (
    <>
      <TermEvaluation
        {...BASE}
        onConfirmAll={() => undefined}
        decisions={ALL_DECISIONS}
        {...props}
      >
        {props.children ?? (
          <EvaluationHistory
            onOpenRun={() => undefined}
            title="Historie termínu"
            entries={HISTORY}
          />
        )}
      </TermEvaluation>
      {overlay}
    </>
  )
}

function bulk(state: BulkConfirmationState, staleReason?: string): ReactNode {
  return evaluation(
    {},
    <BulkConfirmationDialog
      isOpen
      state={state}
      term="1. turnus, 4.–11. 7. 2027"
      people={SUITABLE_NAMES}
      remaining="3 neubytovatelní, 2 ruční určení"
      staleReason={staleReason}
    />,
  )
}

const meta = {
  title: "Designs/Accommodation evaluation/F13-1 F14-1 F16-1 F17-1 F39-1 Term evaluation",
  component: Screen,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { children: null },
} satisfies Meta<typeof Screen>

export default meta

type Story = StoryObj<typeof meta>

/** Current proposal: status, capacity, queues, the whole term order with reasons, and the history. */
export const CurrentProposal: Story = { args: { children: evaluation() } }

/** The current proposal on a narrower desktop: the summary stacks and the order still fits with its actions. */
export const NarrowDesktop: Story = {
  args: { children: evaluation() },
  parameters: {
    viewport: {
      options: {
        narrowDesktop: { name: "Narrow desktop", styles: { width: "1024px", height: "768px" } },
      },
    },
  },
  globals: { viewport: { value: "narrowDesktop", isRotated: false } },
}

/** The order filtered to one queue (fronta Žena): the detail of F16-1 / F39-1 with term positions. */
export const QueueDetail: Story = { args: { children: evaluation({ selectedQueue: "zena" }) } }

/** Inputs changed since the run (manual mode): the bulk confirmation is off until recalculated. */
export const StaleProposal: Story = {
  args: { children: evaluation({ status: "stale", mode: "manual" }) },
}

/** A run is in progress; the older proposal stays visible but cannot be confirmed. */
export const Recalculating: Story = { args: { children: evaluation({ status: "running" }) } }

/** The run failed: an error with a retry; the older proposal is labelled as not current. */
export const RunFailed: Story = {
  args: {
    children: evaluation({ status: "failed" }),
  },
}

/** The solver ran out of its time limit: no new proposal, retry offered. */
export const RunTimedOut: Story = { args: { children: evaluation({ status: "timeout" }) } }

/** Confirmed people no longer fit after a room became unavailable (spec §8 ex. 11): no proposal at all. */
export const Conflict: Story = {
  args: {
    children: evaluation({
      status: "infeasible",
      evaluatedAt: undefined,
      conflict: {
        constraint:
          "Homogenita: potvrzení (5× Žena, 3× Muž) se nevejdou do dostupných pokojů Chata Javor a Chata Buk.",
        confirmed: [
          "Petra Benešová",
          "Zuzana Holá",
          "Markéta Kubíčková",
          "Ivana Šustrová",
          "Hana Vlčková",
          "Jan Kříž",
          "Michal Vondra",
          "Tomáš Žák",
        ],
      },
      capacity: { ...CAPACITY, confirmed: 8, baseBeds: 8, extraBeds: 0, proposal: undefined },
      queues: QUEUES_WITHOUT_RESULT,
      people: WITHOUT_RESULT,
    }),
  },
}

/** Manual mode, the term was never evaluated: no results, empty history. */
export const NeverEvaluated: Story = {
  args: {
    children: evaluation({
      status: "none",
      mode: "manual",
      evaluatedAt: undefined,
      capacity: { ...CAPACITY, proposal: undefined },
      queues: QUEUES_WITHOUT_RESULT,
      people: WITHOUT_RESULT,
      children: (
        <EvaluationHistory
          onOpenRun={() => undefined}
          title="Historie termínu"
          entries={[]}
        />
      ),
    }),
  },
}

// 2. turnus: one room (3 beds) and the earliest registration is a man.
const COUNT_FIRST: OrderPerson[] = [
  {
    id: "c-1",
    position: 1,
    name: "Daniel Říha",
    receivedAt: "2. 3. 2027 8:00",
    answer: "Muž",
    queueId: "muz",
    state: "pending",
    result: "unsuitable",
    reason: "C",
  },
  ...["Ema Šťastná", "Julie Moravcová", "Viktorie Urbanová"].map((name, index): OrderPerson => ({
    id: `c-${index + 2}`,
    position: index + 2,
    name,
    receivedAt: `2. 3. 2027 ${9 + index}:15`,
    answer: "Žena",
    queueId: "zena",
    state: "pending",
    result: "suitable",
  })),
]

/** Variant M (spec §8 ex. 4): three women fit instead of one earlier man, who gets reason C. */
export const CountBeforeOrder: Story = {
  args: {
    children: evaluation({
      selectedTermId: "turnus-2",
      capacity: {
        confirmed: 0,
        pending: 4,
        waitlisted: 0,
        hasRooms: true,
        baseBeds: 3,
        extraBeds: 0,
        proposal: { suitable: 3, unsuitable: 1, manual: 0, baseUsed: 3, extraUsed: 0 },
      },
      queues: [
        { id: "zena", label: "Žena", pending: 3, waitlisted: 0, suitable: 3, unsuitable: 0 },
        { id: "muz", label: "Muž", pending: 1, waitlisted: 0, suitable: 0, unsuitable: 1 },
      ],
      people: COUNT_FIRST,
      children: (
        <EvaluationHistory
          onOpenRun={() => undefined}
          title="Historie termínu"
          entries={[]}
        />
      ),
    }),
  },
}

/** People wait, but the confirmed fill the term: nobody fits, the bulk confirmation is off. */
export const NoneSuitable: Story = {
  args: {
    children: evaluation({
      capacity: {
        ...CAPACITY,
        confirmed: 22,
        pending: 1,
        waitlisted: 2,
        proposal: { suitable: 0, unsuitable: 3, manual: 0, baseUsed: 20, extraUsed: 2 },
      },
      queues: [
        { id: "zena", label: "Žena", pending: 1, waitlisted: 1, suitable: 0, unsuitable: 2 },
        { id: "muz", label: "Muž", pending: 0, waitlisted: 1, suitable: 0, unsuitable: 1 },
      ],
      people: [
        waiting("s-1", 1, "Lucie Sedláčková", "Žena", "zena", "pending", "A"),
        waiting("s-2", 2, "Kristýna Pokorná", "Žena", "zena", "waitlisted", "A"),
        waiting("s-3", 3, "Šimon Pospíšil", "Muž", "muz", "waitlisted", "A"),
      ],
    }),
  },
}

/** 3. turnus has no available room (spec §8 ex. 8): capacity 0, everyone reason N. */
export const NoCapacity: Story = {
  args: {
    children: evaluation({
      selectedTermId: "turnus-3",
      capacity: {
        confirmed: 0,
        pending: 2,
        waitlisted: 0,
        hasRooms: true,
        baseBeds: 0,
        extraBeds: 0,
        proposal: { suitable: 0, unsuitable: 2, manual: 0, baseUsed: 0, extraUsed: 0 },
      },
      queues: [
        { id: "zena", label: "Žena", pending: 1, waitlisted: 0, suitable: 0, unsuitable: 1 },
        { id: "muz", label: "Muž", pending: 1, waitlisted: 0, suitable: 0, unsuitable: 1 },
      ],
      people: [
        waiting("n-1", 1, "Tereza Nováková", "Žena", "zena", "pending", "N"),
        waiting("n-2", 2, "Jakub Svoboda", "Muž", "muz", "pending", "N"),
      ],
      children: (
        <EvaluationHistory
          onOpenRun={() => undefined}
          title="Historie termínu"
          entries={[]}
        />
      ),
    }),
  },
}

/** Nobody unconfirmed in the term: empty state, no queues and no bulk confirmation. */
export const NobodyWaiting: Story = {
  args: {
    children: evaluation({
      capacity: {
        ...CAPACITY,
        confirmed: 18,
        pending: 0,
        waitlisted: 0,
        proposal: { suitable: 0, unsuitable: 0, manual: 0, baseUsed: 18, extraUsed: 0 },
      },
      queues: [],
      people: [],
    }),
  },
}

/** No hard attribute set: one queue, capacity and order only, nobody needs a determination. */
export const WithoutHardAttribute: Story = {
  args: {
    children: evaluation({
      attribute: null,
      capacity: {
        ...CAPACITY,
        proposal: { suitable: 13, unsuitable: 5, manual: 0, baseUsed: 20, extraUsed: 2 },
      },
      queues: [
        { id: "all", label: "Všichni", pending: 14, waitlisted: 4, suitable: 13, unsuitable: 5 },
      ],
      people: PEOPLE.map((person, index) => ({
        ...person,
        queueId: "all",
        determinedAs: undefined,
        result: index < 13 ? "suitable" : "unsuitable",
        reason: index < 13 ? undefined : "A",
      })),
    }),
  },
}

/** The term could not be loaded: an error with a retry, no stale numbers shown as valid. */
export const LoadFailed: Story = { args: { children: evaluation({ isLoadFailed: true }) } }

/** The history could not be loaded: an error with a retry, never an empty history. */
export const HistoryLoadFailed: Story = {
  args: {
    children: evaluation({
      children: (
        <EvaluationHistory
          onOpenRun={() => undefined}
          title="Historie termínu"
          entries={[]}
          isLoadFailed
        />
      ),
    }),
  },
}

/** "Potvrdit všechny vhodné": the people and the count before the one explicit confirmation. */
export const BulkConfirmReview: Story = { args: { children: bulk("review") } }

/** The confirmation is being saved; a second click sends nothing. */
export const BulkConfirmSaving: Story = { args: { children: bulk("saving") } }

/** The re-check found newer inputs: nothing was confirmed, a new proposal must be loaded. */
export const BulkConfirmStale: Story = {
  args: {
    children: bulk(
      "stale",
      "Mezitím přibyla nová přihláška. Načtěte nový návrh a zkontrolujte, koho potvrdíte.",
    ),
  },
}

/** The write failed: states and payments are unchanged, the confirmation can be retried. */
export const BulkConfirmFailed: Story = { args: { children: bulk("failed") } }

/** After the confirmation: the result, the rest stays as it was, and the term recalculates. */
export const BulkConfirmResult: Story = {
  args: {
    children: evaluation({
      status: "running",
      confirmedResult: "Potvrzeno 13 účastí v 1. turnusu.",
      capacity: { ...CAPACITY, confirmed: 22, pending: 4, waitlisted: 1 },
      queues: [
        { id: "zena", label: "Žena", pending: 2, waitlisted: 1, suitable: 0, unsuitable: 3 },
        { id: "muz", label: "Muž", pending: 0, waitlisted: 0, suitable: 0, unsuitable: 0 },
      ],
      people: PEOPLE.filter((person) => person.result !== "suitable").map((person, index) => ({
        ...person,
        position: index + 1,
      })),
    }),
  },
}

/** Confirming a person who needs a manual determination: the value is chosen in the same dialog. */
export const ConfirmWithDetermination: Story = {
  args: {
    children: evaluation(
      {},
      <TermDecisionDialog
        isOpen
        decision="confirm"
        person="Alex Šimek"
        term="1. turnus, 4.–11. 7. 2027"
        determination={{
          answer: "Nechci uvést",
          values: ["Žena", "Muž"],
          value: "Muž",
          reason: "Telefonická domluva s rodiči.",
        }}
      />,
    ),
  },
}

/** Waitlisting one pending person; no value is needed. */
export const WaitlistOne: Story = {
  args: {
    children: evaluation(
      {},
      <TermDecisionDialog
        isOpen
        decision="waitlist"
        person="Sára Benešová"
        term="1. turnus, 4.–11. 7. 2027"
      />,
    ),
  },
}

/** The re-check found no admissible place: the decision is not saved and the reason is shown. */
export const DecisionRejected: Story = {
  args: {
    children: evaluation(
      {},
      <TermDecisionDialog
        isOpen
        decision="confirm"
        person="Lucie Sedláčková"
        term="1. turnus, 4.–11. 7. 2027"
        rejectedReason={reasonText("A", ATTRIBUTE)}
      />,
    ),
  },
}

/** Determining the accommodation of a person whose answer determines no room (all terms). */
export const DetermineAccommodation: Story = {
  args: {
    children: evaluation(
      {},
      <ManualDeterminationDialog
        isOpen
        person="Robin Malý"
        answer="Neuvedeno"
        values={["Žena", "Muž"]}
      />,
    ),
  },
}

/** Missing value and reason: the errors are at the fields, nothing is saved. */
export const DetermineInvalid: Story = {
  args: {
    children: evaluation(
      {},
      <ManualDeterminationDialog
        isOpen
        person="Robin Malý"
        answer="Neuvedeno"
        values={["Žena", "Muž"]}
        valueError="Vyberte, jak osobu ubytovat."
        reasonError="Uveďte důvod určení."
      />,
    ),
  },
}

/** Moving a person within the queue: before or after whom, and why. */
export const MoveForm: Story = {
  args: {
    children: evaluation(
      { selectedQueue: "zena" },
      <QueueMoveDialog
        {...MOVE}
        step="form"
      />,
    ),
  },
}

/** No target and no reason: the errors are at the fields, the other input stays. */
export const MoveInvalid: Story = {
  args: {
    children: evaluation(
      { selectedQueue: "zena" },
      <QueueMoveDialog
        {...MOVE}
        step="form"
        targetId={undefined}
        reason=""
        targetError="Vyberte osobu, před kterou nebo za kterou se má přesunout."
        reasonError="Uveďte důvod změny pořadí."
      />,
    ),
  },
}

/** Before saving: the original and the new order of the queue with the reason. */
export const MoveReview: Story = {
  args: {
    children: evaluation(
      { selectedQueue: "zena" },
      <QueueMoveDialog
        {...MOVE}
        step="review"
      />,
    ),
  },
}

/** The queue changed meanwhile: the stale move is not saved over the newer state. */
export const MoveStale: Story = {
  args: {
    children: evaluation(
      { selectedQueue: "zena" },
      <QueueMoveDialog
        {...MOVE}
        step="stale"
      />,
    ),
  },
}

/** The write of the move and its history failed: the order is unchanged, retry is offered. */
export const MoveFailed: Story = {
  args: {
    children: evaluation(
      { selectedQueue: "zena" },
      <QueueMoveDialog
        {...MOVE}
        step="failed"
      />,
    ),
  },
}

/** "Doklad" of a stored run: who started it, the rules, rooms and beds, and the order it used. */
export const RunEvidence: Story = {
  args: {
    children: evaluation(
      {},
      <RunEvidenceSheet
        isOpen
        runLabel="1. turnus · dnes 14:32"
        startedBy="Automaticky"
        solverVersion="highs-phase1/1"
        rules={{
          attribute: ATTRIBUTE,
          nonDetermining: ["Jiná odpověď", "Nechci uvést", "Neuvedeno"],
        }}
        rooms={[
          { id: "r-1", label: "Chata Javor", baseBeds: 4, extraBeds: 1 },
          { id: "r-2", label: "Chata Buk", baseBeds: 4, extraBeds: 1 },
          { id: "r-3", label: "Chata Dub", baseBeds: 4, extraBeds: 0 },
          { id: "r-4", label: "Chata Lípa", baseBeds: 4, extraBeds: 0 },
          { id: "r-5", label: "Pokoj u kuchyně", baseBeds: 2, extraBeds: 0 },
          { id: "r-6", label: "Pokoj u klubovny", baseBeds: 2, extraBeds: 0 },
        ]}
        confirmedCount={9}
        isOrderManual
        order={EVIDENCE_ORDER}
      />,
    ),
  },
}
