import type { ReactNode } from "react"
import { CircleAlert, CircleCheck, ClipboardList, Ellipsis, Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ErrorAlert } from "@/features/accommodation/components/ErrorAlert"
import { RetryAlert } from "@/features/accommodation/components/RetryAlert"
import {
  TermCapacitySummary,
  type TermCapacity,
} from "@/features/accommodation/components/TermCapacitySummary"
import { TermQueues, type TermQueue } from "@/features/accommodation/components/TermQueues"
import {
  isConfirmable,
  reasonText,
  RESULT_BADGE,
  STATE_LABEL,
  STATUS_BADGE,
  type EvaluationStatus,
  type ParticipationState,
  type ProposalResult,
  type ReasonCode,
} from "@/features/accommodation/lib/proposal"

export type EvaluationTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "4.–11. 7. 2027". */
  dates: string
}

/** One unconfirmed person in the term order (spec v4 §1, §6). */
export type OrderPerson = {
  id: string
  /** Position in the order of the whole term, 1 = highest priority. */
  position: number
  name: string
  /** Already formatted, e.g. "12. 3. 2027 18:41". */
  receivedAt: string
  /** The participant's own answer to the hard attribute, e.g. "Nechci uvést". */
  answer: string
  /** The organizer's determination of the effective value (spec v4 §4), e.g. "Žena". */
  determinedAs?: string
  /** The queue of the effective value; null when it needs a manual determination. */
  queueId: string | null
  state: ParticipationState
  /** Missing without a valid proposal (conflict, never evaluated). */
  result?: ProposalResult
  reason?: ReasonCode
  /** An organizer moved the person in the order (F39-1). */
  isMovedByHand?: boolean
}

export type EvaluationConflict = {
  /** The violated hard constraint, already worded. */
  constraint: string
  /** The confirmed participants the constraint concerns. */
  confirmed: string[]
}

export type TermEvaluationProps = {
  terms: EvaluationTerm[]
  selectedTermId: string
  mode: "automatic" | "manual"
  status: EvaluationStatus
  /** When the shown proposal was evaluated, e.g. "dnes 14:32". */
  evaluatedAt?: string
  conflict?: EvaluationConflict
  /** The hard attribute, e.g. "Pohlaví"; null when the event has none. */
  attribute: string | null
  capacity: TermCapacity
  queues: TermQueue[]
  people: OrderPerson[]
  /** The queue shown in the order: "all", a queue id or "manual". */
  selectedQueue?: string
  /** The result of the bulk confirmation just saved, already worded. */
  confirmedResult?: string
  /** The term could not be loaded; nothing else is shown as valid. */
  isLoadFailed?: boolean
  /** Below the order: the history of the term (F39-1). */
  children?: ReactNode
  onSelectTerm?: (termId: string) => void
  /** With it the queue tabs follow `selectedQueue`, e.g. kept in the URL. */
  onSelectQueue?: (queue: string) => void
  onRecalculate?: () => void
  /** "Přepočítat" was refused or failed, already worded; the shown data stay. */
  recalculateError?: string
  onRetryLoad?: () => void
  /** The bulk confirmation (F14-1); without it the button is not offered. */
  onConfirmAll?: () => void
  /** The decisions per person; a missing one is not offered. */
  decisions?: PersonDecisions
  /** The person's name, e.g. as a link to the registration detail. */
  renderName?: (person: OrderPerson) => ReactNode
}

/** What the organizer may do with one person of the order. */
export type PersonDecisions = {
  /** F14-1. */
  onConfirm?: (person: OrderPerson) => void
  onWaitlist?: (person: OrderPerson) => void
  /** Spec v4 §4; offered to someone needing or having a determination. */
  onDetermine?: (person: OrderPerson) => void
  /** F39-1. */
  onMove?: (person: OrderPerson) => void
}

const hasDecisions = (decisions: PersonDecisions): boolean => Object.values(decisions).some(Boolean)

function persons(count: number) {
  if (count === 1) return "1 osoba"
  if (count >= 2 && count <= 4) return `${count} osoby`
  return `${count} osob`
}

function DecisionMenu({ person, decisions }: { person: OrderPerson; decisions: PersonDecisions }) {
  const canDetermine =
    person.result === "manual" || person.queueId === null || person.determinedAs !== undefined
  const canDecide =
    decisions.onConfirm !== undefined ||
    (person.state === "pending" && decisions.onWaitlist !== undefined)
  const determine = canDetermine ? decisions.onDetermine : undefined
  const move = person.queueId ? decisions.onMove : undefined
  if (!canDecide && !determine && !move) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Akce: ${person.name}`}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {decisions.onConfirm ? (
          <DropdownMenuItem onSelect={() => decisions.onConfirm?.(person)}>
            Potvrdit účast
          </DropdownMenuItem>
        ) : null}
        {person.state === "pending" && decisions.onWaitlist ? (
          <DropdownMenuItem onSelect={() => decisions.onWaitlist?.(person)}>
            Zařadit mezi náhradníky
          </DropdownMenuItem>
        ) : null}
        {canDecide && (determine || move) ? <DropdownMenuSeparator /> : null}
        {determine ? (
          <DropdownMenuItem onSelect={() => determine(person)}>
            {person.determinedAs ? "Změnit určení ubytování" : "Určit ubytování"}
          </DropdownMenuItem>
        ) : null}
        {move ? (
          <DropdownMenuItem onSelect={() => move(person)}>Změnit pořadí</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StateBadge({ state }: { state: ParticipationState }) {
  return (
    <Badge variant={state === "waitlisted" ? "warning" : "secondary"}>{STATE_LABEL[state]}</Badge>
  )
}

// On a narrow card the state moves under the name instead of its own column, so
// the row keeps its actions in view without scrolling sideways.
type OrderTableProps = {
  people: OrderPerson[]
  attribute: string | null
  decisions: PersonDecisions
  renderName?: (person: OrderPerson) => ReactNode
}

function OrderTable({ people, attribute, decisions, renderName }: OrderTableProps) {
  const hasActions = hasDecisions(decisions)
  return (
    <div className="@container">
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">Pořadí</TableHead>
              <TableHead>Účastník</TableHead>
              {attribute ? <TableHead>{attribute}</TableHead> : null}
              <TableHead className="hidden @2xl:table-cell">Stav</TableHead>
              <TableHead>Návrh</TableHead>
              {hasActions ? (
                <TableHead>
                  <span className="sr-only">Akce</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => (
              <TableRow key={person.id}>
                <TableCell className="text-right">{person.position}.</TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{renderName ? renderName(person) : person.name}</span>
                    {person.isMovedByHand ? <Badge variant="outline">Přesunuto ručně</Badge> : null}
                  </div>
                  <p className="text-muted-foreground">
                    Přihlášeno <span className="whitespace-nowrap">{person.receivedAt}</span>
                  </p>
                  <div className="mt-1 @2xl:hidden">
                    <StateBadge state={person.state} />
                  </div>
                </TableCell>
                {attribute ? (
                  <TableCell className="whitespace-normal">
                    <p>{person.answer}</p>
                    {person.determinedAs ? (
                      <p className="text-muted-foreground">Určeno: {person.determinedAs}</p>
                    ) : null}
                  </TableCell>
                ) : null}
                <TableCell className="hidden @2xl:table-cell">
                  <StateBadge state={person.state} />
                </TableCell>
                <TableCell className="whitespace-normal">
                  {person.result ? (
                    <div className="space-y-1">
                      <Badge variant={RESULT_BADGE[person.result].variant}>
                        {RESULT_BADGE[person.result].label}
                      </Badge>
                      {person.reason ? (
                        <p className="text-muted-foreground">
                          {reasonText(person.reason, attribute ?? "")}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                {hasActions ? (
                  <TableCell className="text-right">
                    <DecisionMenu
                      person={person}
                      decisions={decisions}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function StatusAlert({
  status,
  conflict,
  onRecalculate,
}: Pick<TermEvaluationProps, "status" | "conflict" | "onRecalculate">) {
  switch (status) {
    case "stale":
      return (
        <Alert>
          <CircleAlert />
          <AlertTitle>Podklady se od výpočtu změnily</AlertTitle>
          <AlertDescription>Návrh nelze hromadně potvrdit, dokud se nepřepočítá.</AlertDescription>
        </Alert>
      )
    case "failed":
    case "timeout":
      return (
        <RetryAlert
          title={status === "failed" ? "Výpočet se nezdařil" : "Výpočet nedoběhl v časovém limitu"}
          onRetry={onRecalculate}
        />
      )
    case "infeasible":
      return (
        <Alert>
          <CircleAlert />
          <AlertTitle>Potvrzení účastníci se nevejdou do dostupných pokojů</AlertTitle>
          <AlertDescription>
            <p>{conflict?.constraint}</p>
            <p>Dotčení potvrzení: {conflict?.confirmed.join(", ")}</p>
          </AlertDescription>
        </Alert>
      )
    case "none":
      return (
        <Alert>
          <CircleAlert />
          <AlertTitle>Termín zatím nebyl vyhodnocen</AlertTitle>
        </Alert>
      )
    default:
      return null
  }
}

// Správa akce → Přihlášky → Vyhodnocení → vybraný termín (F13-1, F14-1, F16-1,
// F17-1, F39-1): the proposal of one term with its status, the bulk
// confirmation, capacity, the queues and the whole term order with the
// decisions per person. Design only: every value is passed in.
export function TermEvaluation({
  terms,
  selectedTermId,
  mode,
  status,
  evaluatedAt,
  conflict,
  attribute,
  capacity,
  queues,
  people,
  selectedQueue = "all",
  confirmedResult,
  isLoadFailed = false,
  children,
  onSelectTerm,
  onSelectQueue,
  onRecalculate,
  recalculateError,
  onRetryLoad,
  onConfirmAll,
  decisions = {},
  renderName,
}: TermEvaluationProps) {
  const selectedTerm = terms.find((term) => term.id === selectedTermId)
  const suitable = people.filter((person) => person.result === "suitable").length
  const manual = people.filter((person) => person.queueId === null)
  const canConfirm = isConfirmable(status) && suitable > 0
  const isRunning = status === "running"
  const badge = STATUS_BADGE[status]

  return (
    <section
      aria-labelledby="term-evaluation-heading"
      className="space-y-4"
    >
      <h2
        id="term-evaluation-heading"
        className="text-h4"
      >
        Vyhodnocení termínu
      </h2>

      <Tabs
        value={selectedTermId}
        onValueChange={onSelectTerm}
      >
        {/* Many terms scroll inside their row, never the page (360 px). */}
        <div className="max-w-full overflow-x-auto pb-1">
          <TabsList aria-label="Termín">
            {terms.map((term) => (
              <TabsTrigger
                key={term.id}
                value={term.id}
              >
                {term.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={selectedTermId}>
          {isLoadFailed ? (
            <RetryAlert
              title="Vyhodnocení termínu se nepodařilo načíst"
              onRetry={onRetryLoad}
            />
          ) : (
            <div className="mt-2 space-y-6">
              <Card>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {selectedTerm?.label}, {selectedTerm?.dates}
                        </p>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {evaluatedAt
                          ? `Návrh z ${evaluatedAt}${isConfirmable(status) ? "" : " (neaktuální)"} · `
                          : ""}
                        {mode === "automatic"
                          ? "Aktualizuje se automaticky"
                          : "Aktualizuje se ručně"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={isRunning}
                        onClick={onRecalculate}
                      >
                        {isRunning ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                        {isRunning ? "Přepočítává se…" : "Přepočítat"}
                      </Button>
                      {onConfirmAll ? (
                        <Button
                          disabled={!canConfirm}
                          onClick={onConfirmAll}
                        >
                          Potvrdit všechny vhodné{canConfirm ? ` (${suitable})` : ""}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {recalculateError ? (
                <ErrorAlert
                  title="Přepočet se nepodařilo spustit"
                  detail={recalculateError}
                />
              ) : null}

              <StatusAlert
                status={status}
                conflict={conflict}
                onRecalculate={onRecalculate}
              />

              {confirmedResult ? (
                <Alert>
                  <CircleCheck />
                  <AlertTitle>{confirmedResult}</AlertTitle>
                </Alert>
              ) : null}

              <Card>
                <CardContent>
                  <TermCapacitySummary term={capacity} />
                </CardContent>
              </Card>

              {people.length === 0 ? (
                <Card>
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <ClipboardList />
                      </EmptyMedia>
                      <EmptyTitle>V termínu nikdo nečeká na rozhodnutí ani na místo</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </Card>
              ) : (
                <>
                  {isConfirmable(status) && suitable === 0 && !confirmedResult ? (
                    <Alert>
                      <CircleAlert />
                      <AlertTitle>Nikdo z čekajících se nyní nevejde</AlertTitle>
                    </Alert>
                  ) : null}

                  <section
                    aria-labelledby="term-queues-heading"
                    className="space-y-3"
                  >
                    <h3
                      id="term-queues-heading"
                      className="text-h4"
                    >
                      Fronty
                    </h3>
                    <TermQueues
                      queues={queues}
                      manualCount={manual.length}
                    />
                  </section>

                  <section
                    aria-labelledby="term-order-heading"
                    className="space-y-3"
                  >
                    <h3
                      id="term-order-heading"
                      className="text-h4"
                    >
                      Pořadí
                    </h3>
                    <Tabs
                      {...(onSelectQueue
                        ? { value: selectedQueue, onValueChange: onSelectQueue }
                        : { defaultValue: selectedQueue })}
                    >
                      <div className="max-w-full overflow-x-auto pb-1">
                        <TabsList aria-label="Fronta">
                          <TabsTrigger value="all">Celý termín ({people.length})</TabsTrigger>
                          {attribute
                            ? queues.map((queue) => (
                                <TabsTrigger
                                  key={queue.id}
                                  value={queue.id}
                                >
                                  {queue.label} ({queue.pending + queue.waitlisted})
                                </TabsTrigger>
                              ))
                            : null}
                          {manual.length > 0 ? (
                            <TabsTrigger value="manual">Ruční určení ({manual.length})</TabsTrigger>
                          ) : null}
                        </TabsList>
                      </div>
                      <TabsContent value="all">
                        <OrderTable
                          people={people}
                          attribute={attribute}
                          decisions={decisions}
                          renderName={renderName}
                        />
                      </TabsContent>
                      {queues.map((queue) => {
                        const inQueue = people.filter((person) => person.queueId === queue.id)
                        return (
                          <TabsContent
                            key={queue.id}
                            value={queue.id}
                          >
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">
                                {selectedTerm?.label} · fronta {queue.label} ·{" "}
                                {persons(inQueue.length)}
                              </p>
                              <OrderTable
                                people={inQueue}
                                attribute={attribute}
                                decisions={decisions}
                                renderName={renderName}
                              />
                            </div>
                          </TabsContent>
                        )
                      })}
                      <TabsContent value="manual">
                        <OrderTable
                          people={manual}
                          attribute={attribute}
                          decisions={decisions}
                          renderName={renderName}
                        />
                      </TabsContent>
                    </Tabs>
                  </section>
                </>
              )}

              {children}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}
