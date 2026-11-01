import { CircleAlert, ClipboardList, RefreshCw, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type EvaluationTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "4.–11. 7. 2027". */
  dates: string
}

export type ProposalStatus = "current" | "stale" | "computing" | "failed" | "conflict"

export type Suitability = "suitable" | "unsuitable" | "manual"

export type ReasonCode = "A" | "B" | "C" | "N" | "R"

export type ParticipationState = "pending" | "waitlisted"

export type ProposalPerson = {
  id: string
  /** Position in the order of the term. */
  position: number
  name: string
  state: ParticipationState
  /** Answer to the hard attribute, e.g. "Žena", "Nechci uvést", "Neuvedeno". */
  answer: string
  /** Missing while the proposal has no result (conflict). */
  suitability?: Suitability
  reason?: ReasonCode
}

export type ProposalConflict = {
  /** The violated constraint, already worded. */
  constraint: string
  /** Confirmed participants the constraint concerns. */
  participants: string[]
}

export type TermProposal = {
  status: ProposalStatus
  /** Already formatted, e.g. "dnes 14:32". Missing before the first run. */
  lastRun?: string
  suitableCount: number
  unsuitableCount: number
  manualCount: number
  people: ProposalPerson[]
  conflict?: ProposalConflict
}

type EvaluationProposalProps = {
  terms: EvaluationTerm[]
  selectedTermId: string
  proposal: TermProposal
}

const REASON_TEXT: Record<ReasonCode, string> = {
  A: "Kapacita termínu je naplněna potvrzenými a osobami s vyšší prioritou.",
  B: "Volné místo je jen v pokojích s jinou hodnotou pohlaví.",
  C: "Ubytování by snížilo celkový počet ubytovaných.",
  N: "Termín nemá dostupnou kapacitu.",
  R: "Vyžaduje ruční určení ubytování.",
}

const STATUS_BADGE: Record<
  ProposalStatus,
  { label: string; variant: "success" | "warning" | "secondary" | "destructive-subtle" }
> = {
  current: { label: "Aktuální návrh", variant: "success" },
  stale: { label: "Neaktuální návrh", variant: "warning" },
  computing: { label: "Počítá se…", variant: "secondary" },
  failed: { label: "Výpočet selhal", variant: "destructive-subtle" },
  conflict: { label: "Konflikt", variant: "destructive-subtle" },
}

const STATE_LABEL: Record<ParticipationState, string> = {
  pending: "Čeká na rozhodnutí",
  waitlisted: "Náhradník",
}

function SuitabilityBadge({ suitability }: { suitability?: Suitability }) {
  switch (suitability) {
    case "suitable":
      return <Badge variant="success">Vhodný</Badge>
    case "unsuitable":
      return <Badge variant="destructive-subtle">Neubytovatelný</Badge>
    case "manual":
      return <Badge variant="warning">Ruční určení</Badge>
    default:
      return <Badge variant="outline">Bez návrhu</Badge>
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-h3">{value}</dd>
    </div>
  )
}

function StatusAlert({ proposal }: { proposal: TermProposal }) {
  if (proposal.status === "stale") {
    return (
      <Alert>
        <TriangleAlert />
        <AlertTitle>Návrh je neaktuální</AlertTitle>
        <AlertDescription>
          Podklady se od posledního výpočtu změnily. Hromadné potvrzení není dostupné, dokud návrh
          nepřepočítáte.
        </AlertDescription>
      </Alert>
    )
  }
  if (proposal.status === "failed") {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Výpočet selhal</AlertTitle>
        <AlertDescription>
          Zobrazený návrh je starší a je neaktuální. Potvrzené účasti zůstaly beze změny. Zkuste
          návrh přepočítat znovu.
        </AlertDescription>
      </Alert>
    )
  }
  if (proposal.status === "conflict" && proposal.conflict) {
    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Konflikt</AlertTitle>
        <AlertDescription>
          <p>{proposal.conflict.constraint}</p>
          <p>Dotčení potvrzení účastníci: {proposal.conflict.participants.join(", ")}.</p>
        </AlertDescription>
      </Alert>
    )
  }
  return null
}

// Správa akce → Přihlášky → Ke schválení (F13-1): the evaluation proposal of
// the selected term. Design only: every value is passed in.
export function EvaluationProposal({ terms, selectedTermId, proposal }: EvaluationProposalProps) {
  const selectedTerm = terms.find((term) => term.id === selectedTermId)
  const isComputing = proposal.status === "computing"
  const canConfirm = proposal.status === "current" && proposal.suitableCount > 0
  const hasNoCapacity =
    proposal.people.length > 0 &&
    proposal.people.every((person) => person.reason === "N" || person.reason === "R") &&
    proposal.suitableCount === 0 &&
    proposal.status === "current"

  return (
    <section aria-labelledby="evaluation-proposal-heading">
      <h2
        id="evaluation-proposal-heading"
        className="mb-4 text-h4"
      >
        Ke schválení
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
          <div className="mt-2 space-y-4">
            <Card>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm text-muted-foreground">
                        {selectedTerm?.label}, {selectedTerm?.dates}
                      </p>
                      <Badge variant={STATUS_BADGE[proposal.status].variant}>
                        {STATUS_BADGE[proposal.status].label}
                      </Badge>
                      {proposal.lastRun ? (
                        <p className="text-sm text-muted-foreground">
                          Poslední přepočet: {proposal.lastRun}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={isComputing}
                      >
                        <RefreshCw />
                        Přepočítat
                      </Button>
                      <Button disabled={!canConfirm}>Potvrdit vhodné</Button>
                    </div>
                  </div>

                  <dl className="grid grid-cols-3 gap-4">
                    <Stat
                      label="Vhodní"
                      value={proposal.suitableCount}
                    />
                    <Stat
                      label="Neubytovatelní"
                      value={proposal.unsuitableCount}
                    />
                    <Stat
                      label="Ruční určení"
                      value={proposal.manualCount}
                    />
                  </dl>
                </div>
              </CardContent>
            </Card>

            <StatusAlert proposal={proposal} />

            {hasNoCapacity ? (
              <Alert>
                <TriangleAlert />
                <AlertTitle>Termín nemá využitelnou kapacitu</AlertTitle>
                <AlertDescription>
                  Žádná osoba není vhodná k potvrzení. Kapacitu upravíte v části Ubytování.
                </AlertDescription>
              </Alert>
            ) : null}

            {proposal.people.length === 0 ? (
              <Card>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardList />
                    </EmptyMedia>
                    <EmptyTitle>V tomto termínu nikdo nečeká na rozhodnutí</EmptyTitle>
                    <EmptyDescription>Nové přihlášky a náhradníci se zobrazí zde.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </Card>
            ) : (
              <Card padding="none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">Pořadí</TableHead>
                      <TableHead>Účastník</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead>Pohlaví</TableHead>
                      <TableHead>Návrh</TableHead>
                      <TableHead>Důvod</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposal.people.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell className="text-right">{person.position}</TableCell>
                        <TableCell>{person.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{STATE_LABEL[person.state]}</Badge>
                        </TableCell>
                        <TableCell>{person.answer}</TableCell>
                        <TableCell>
                          <SuitabilityBadge suitability={person.suitability} />
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          {person.reason ? (
                            <span>
                              <strong>{person.reason}</strong> · {REASON_TEXT[person.reason]}
                            </span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
