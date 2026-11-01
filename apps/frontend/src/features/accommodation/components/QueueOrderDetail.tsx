import { ArrowUpDown, RotateCw, Users } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type QueueParticipationState = "pending" | "waitlisted" | "confirmed"

export type QueueOrderPerson = {
  id: string
  /** Position in the term order; absent for confirmed people, who are not in the order. */
  position?: number
  name: string
  state: QueueParticipationState
  /** Already formatted, e.g. "12. 3. 2027 18:41". */
  receivedAt: string
  /** True when an organizer moved the person by hand. */
  isMovedByHand?: boolean
}

export type QueueOrderDetailProps = {
  /** E.g. "1. turnus · Fronta Žena". */
  queueLabel: string
  people: QueueOrderPerson[]
  /** The queue could not be loaded; never rendered as an empty queue. */
  isLoadFailed?: boolean
  onMove?: (personId: string) => void
  onRetry?: () => void
}

const STATE_LABELS: Record<QueueParticipationState, string> = {
  pending: "Čeká na rozhodnutí",
  waitlisted: "Náhradník",
  confirmed: "Potvrzeno",
}

const STATE_VARIANTS = {
  pending: "secondary",
  waitlisted: "warning",
  confirmed: "success",
} as const

function StateBadge({ state }: { state: QueueParticipationState }) {
  return <Badge variant={STATE_VARIANTS[state]}>{STATE_LABELS[state]}</Badge>
}

// Správa akce → Přihlášky → Náhradníci → termín a typ pokoje → Pořadí (F39-1).
// Design only: every value is passed in.
export function QueueOrderDetail({
  queueLabel,
  people,
  isLoadFailed = false,
  onMove,
  onRetry,
}: QueueOrderDetailProps) {
  if (isLoadFailed) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Pořadí se nepodařilo načíst. Zkuste to znovu.</AlertTitle>
        <AlertDescription>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRetry}
          >
            <RotateCw />
            Zkusit znovu
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  const waiting = people.filter((person) => person.state !== "confirmed")
  const confirmed = people.filter((person) => person.state === "confirmed")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-h4">Pořadí · {queueLabel}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waiting.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>Ve frontě nikdo nečeká</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pozice</TableHead>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Přihlášeno</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waiting.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <span className="font-mono">{person.position}.</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{person.name}</span>{" "}
                      {person.isMovedByHand ? (
                        <Badge variant="outline">Ručně přesunuto</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StateBadge state={person.state} />
                    </TableCell>
                    <TableCell>{person.receivedAt}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMove?.(person.id)}
                      >
                        <ArrowUpDown />
                        Přesunout
                        <span className="sr-only"> {person.name}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {confirmed.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className="text-h4">Potvrzení</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Přihlášeno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmed.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell>
                      <span className="font-medium">{person.name}</span>
                    </TableCell>
                    <TableCell>
                      <StateBadge state={person.state} />
                    </TableCell>
                    <TableCell>{person.receivedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
