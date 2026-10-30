import { ClipboardCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/** One pending request in the organizer's list, already formatted. */
export type PendingChangeRequest = {
  id: string
  participant: string
  email: string
  /** E.g. "Přesun termínu", "Úprava údajů", "Odhlášení přihlášky". */
  kind: string
  /** E.g. "Turnus 1 → Turnus 3". */
  terms: string
  submittedAt: string
}

// Správa akce → Přihlášky → Ke schválení (F35-2a): the participants' change
// requests of this event, oldest first, each opening the registration detail.
// Design only: every value is passed in.
export function ChangeRequestsTable({ requests }: { requests: PendingChangeRequest[] }) {
  if (requests.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardCheck />
          </EmptyMedia>
          <EmptyTitle>Žádné změny nečekají na schválení.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Card padding="none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Účastník</TableHead>
            <TableHead>Změna</TableHead>
            <TableHead>Termíny</TableHead>
            <TableHead>Odesláno</TableHead>
            <TableHead>
              <span className="sr-only">Otevřít</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <p className="font-medium">{request.participant}</p>
                <p className="text-xs text-muted-foreground">{request.email}</p>
              </TableCell>
              <TableCell>{request.kind}</TableCell>
              <TableCell>{request.terms}</TableCell>
              <TableCell>{request.submittedAt}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Otevřít žádost ${request.participant}`}
                >
                  Otevřít
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
