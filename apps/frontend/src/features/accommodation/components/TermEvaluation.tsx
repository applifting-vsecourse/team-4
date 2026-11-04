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
}

function persons(count: number) {
  if (count === 1) return "1 osoba"
  if (count >= 2 && count <= 4) return `${count} osoby`
  return `${count} osob`
}

function DecisionMenu({ person }: { person: OrderPerson }) {
  const canDetermine = person.result === "manual" || person.determinedAs !== undefined

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
        <DropdownMenuItem>Potvrdit účast</DropdownMenuItem>
        {person.state === "pending" ? (
          <DropdownMenuItem>Zařadit mezi náhradníky</DropdownMenuItem>
        ) : null}
        {canDetermine || person.queueId ? <DropdownMenuSeparator /> : null}
        {canDetermine ? (
          <DropdownMenuItem>
            {person.determinedAs ? "Změnit určení ubytování" : "Určit ubytování"}
          </DropdownMenuItem>
        ) : null}
        {person.queueId ? <DropdownMenuItem>Změnit pořadí</DropdownMenuItem> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function OrderTable({ people, attribute }: { people: OrderPerson[]; attribute: string | null }) {
  return (
    <Card padding="none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">Pořadí</TableHead>
            <TableHead>Účastník</TableHead>
            {attribute ? <TableHead>{attribute}</TableHead> : null}
            <TableHead>Stav</TableHead>
            <TableHead>Návrh</TableHead>
            <TableHead>
              <span className="sr-only">Akce</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => (
            <TableRow key={person.id}>
              <TableCell className="text-right">{person.position}.</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <span>{person.name}</span>
                  {person.isMovedByHand ? <Badge variant="outline">Přesunuto ručně</Badge> : null}
                </div>
                <p className="text-muted-foreground">Přihlášeno {person.receivedAt}</p>
              </TableCell>
              {attribute ? (
                <TableCell>
                  <p>{person.answer}</p>
                  {person.determinedAs ? (
                    <p className="text-muted-foreground">Určeno: {person.determinedAs}</p>
                  ) : null}
                </TableCell>
              ) : null}
              <TableCell>
                <Badge variant={person.state === "waitlisted" ? "warning" : "secondary"}>
                  {STATE_LABEL[person.state]}
                </Badge>
              </TableCell>
              <TableCell>
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
              <TableCell className="text-right">
                <DecisionMenu person={person} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function StatusAlert({ status, conflict }: Pick<TermEvaluationProps, "status" | "conflict">) {
  switch (status) {
    case "stale":
      return (
        <Alert>
          <CircleAlert />
          <AlertTitle>Podklady se od výpočtu změnily, návrh nelze hromadně potvrdit</AlertTitle>
        </Alert>
      )
    case "failed":
    case "timeout":
      return (
        <RetryAlert
          title={status === "failed" ? "Výpočet se nezdařil" : "Výpočet nedoběhl v časovém limitu"}
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

      <Tabs value={selectedTermId}>
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

        <TabsContent value={selectedTermId}>
          {isLoadFailed ? (
            <RetryAlert title="Vyhodnocení termínu se nepodařilo načíst" />
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
                      >
                        {isRunning ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                        {isRunning ? "Přepočítává se…" : "Přepočítat"}
                      </Button>
                      <Button disabled={!canConfirm}>
                        Potvrdit všechny vhodné{canConfirm ? ` (${suitable})` : ""}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <StatusAlert
                status={status}
                conflict={conflict}
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
                    <Tabs defaultValue={selectedQueue}>
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
                      <TabsContent value="all">
                        <OrderTable
                          people={people}
                          attribute={attribute}
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
                              />
                            </div>
                          </TabsContent>
                        )
                      })}
                      <TabsContent value="manual">
                        <OrderTable
                          people={manual}
                          attribute={attribute}
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
