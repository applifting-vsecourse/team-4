import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/**
 * One queue of the term: the unconfirmed people of one determining value of
 * the hard attribute (the "room type" of spec v4 §1), or everyone without a
 * hard attribute. People needing a manual determination are in no queue.
 */
export type TermQueue = {
  id: string
  /** E.g. "Žena"; "Všichni" without a hard attribute. */
  label: string
  pending: number
  waitlisted: number
  /** Missing without a valid proposal. */
  suitable?: number
  unsuitable?: number
}

export type TermQueuesProps = {
  queues: TermQueue[]
  /** Unconfirmed people without an effective value (reason R). */
  manualCount: number
}

const count = (value: number | undefined) => value ?? "—"

// Správa akce → Přihlášky → Vyhodnocení → vybraný termín → Fronty (F16-1):
// totals per queue, no names; the people are in the order below. Design
// only: every value is passed in.
export function TermQueues({ queues, manualCount }: TermQueuesProps) {
  return (
    <Card padding="none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fronta</TableHead>
            <TableHead className="text-right whitespace-normal">Čekají na rozhodnutí</TableHead>
            <TableHead className="text-right">Náhradníci</TableHead>
            <TableHead className="text-right">Vhodní</TableHead>
            <TableHead className="text-right">Neubytovatelní</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queues.map((queue) => (
            <TableRow key={queue.id}>
              <TableCell>{queue.label}</TableCell>
              <TableCell className="text-right">{queue.pending}</TableCell>
              <TableCell className="text-right">{queue.waitlisted}</TableCell>
              <TableCell className="text-right">{count(queue.suitable)}</TableCell>
              <TableCell className="text-right">{count(queue.unsuitable)}</TableCell>
            </TableRow>
          ))}
          {manualCount > 0 ? (
            <TableRow>
              <TableCell>Ruční určení</TableCell>
              <TableCell
                className="text-right"
                colSpan={4}
              >
                {manualCount}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </Card>
  )
}
