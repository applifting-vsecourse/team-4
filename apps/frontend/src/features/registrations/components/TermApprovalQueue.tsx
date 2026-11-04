import { CircleCheck, ClipboardList, Ellipsis } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export type ApprovalTerm = {
  id: string
  label: string
  /** Already formatted, e.g. "4.–11. 7. 2027". */
  dates: string
}

export type ApprovalSuitability = "suitable" | "unsuitable" | "manual"

export type ApprovalPerson = {
  id: string
  name: string
  state: "pending" | "waitlisted"
  suitability: ApprovalSuitability
}

export type TermApprovalQueueProps = {
  terms: ApprovalTerm[]
  selectedTermId: string
  isProposalCurrent: boolean
  people: ApprovalPerson[]
  /** The result of the bulk confirmation just saved, already worded. */
  confirmedResult?: string
}

const STATE_LABEL: Record<ApprovalPerson["state"], string> = {
  pending: "Čeká na rozhodnutí",
  waitlisted: "Náhradník",
}

const SUITABILITY_BADGE: Record<
  ApprovalSuitability,
  { label: string; variant: "success" | "warning" | "destructive-subtle" }
> = {
  suitable: { label: "Vhodný", variant: "success" },
  unsuitable: { label: "Neubytovatelný", variant: "destructive-subtle" },
  manual: { label: "Ruční určení", variant: "warning" },
}

// Unresolved manual accommodation cannot be bypassed, so such a person offers
// no confirmation; a waitlisted person is already on the waitlist.
function DecisionMenu({ person }: { person: ApprovalPerson }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Rozhodnout: ${person.name}`}
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {person.suitability === "manual" ? null : (
          <DropdownMenuItem>Potvrdit účast</DropdownMenuItem>
        )}
        {person.state === "pending" ? (
          <DropdownMenuItem>Zařadit mezi náhradníky</DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Správa akce → Přihlášky → Ke schválení → vybraný termín (F14-1): the
// proposal of the term with the bulk confirmation and a decision per person.
// Design only: every value is passed in.
export function TermApprovalQueue({
  terms,
  selectedTermId,
  isProposalCurrent,
  people,
  confirmedResult,
}: TermApprovalQueueProps) {
  const selectedTerm = terms.find((term) => term.id === selectedTermId)
  const suitableCount = people.filter((person) => person.suitability === "suitable").length
  const canConfirm = isProposalCurrent && suitableCount > 0

  return (
    <section
      aria-labelledby="term-approval-heading"
      className="space-y-4"
    >
      <h2
        id="term-approval-heading"
        className="text-h4"
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
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      {selectedTerm?.label}, {selectedTerm?.dates}
                    </p>
                    {isProposalCurrent ? (
                      <Badge variant="success">Aktuální návrh</Badge>
                    ) : (
                      <Badge variant="warning">Neaktuální návrh</Badge>
                    )}
                  </div>
                  <Button disabled={!canConfirm}>
                    Potvrdit všechny vhodné{canConfirm ? ` (${suitableCount})` : ""}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {confirmedResult ? (
              <Alert>
                <CircleCheck />
                <AlertTitle>{confirmedResult}</AlertTitle>
              </Alert>
            ) : null}

            {isProposalCurrent && suitableCount === 0 && !confirmedResult ? (
              <Card>
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardList />
                    </EmptyMedia>
                    <EmptyTitle>V návrhu termínu není nikdo vhodný k potvrzení</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              </Card>
            ) : null}

            {people.length > 0 ? (
              <Card padding="none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Účastník</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead>Návrh</TableHead>
                      <TableHead>
                        <span className="sr-only">Rozhodnutí</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {people.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell>{person.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{STATE_LABEL[person.state]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={SUITABILITY_BADGE[person.suitability].variant}>
                            {SUITABILITY_BADGE[person.suitability].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DecisionMenu person={person} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}
