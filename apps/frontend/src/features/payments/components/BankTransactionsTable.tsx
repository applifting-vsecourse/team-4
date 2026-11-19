import { Money } from "@/components/Money"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCalendarDate } from "@/lib/date"

import type { BankTransaction } from "@/features/payments/api/paymentSchemas"
import { PairTransactionDialog } from "@/features/payments/components/PairTransactionDialog"

type BankTransactionsTableProps = {
  organizationId: string
  eventId: string
  transactions: BankTransaction[]
  /** After a transaction was paired by hand. */
  onPaired?: () => void
}

// The event's unpaired transactions as the statement lists them, newest
// first; each can be paired with a registration by hand (F24).
export function BankTransactionsTable({
  organizationId,
  eventId,
  transactions,
  onPaired,
}: BankTransactionsTableProps) {
  return (
    <Card padding="none">
      <Table containerLabel="Tabulka nespárovaných transakcí">
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Variabilní symbol</TableHead>
            <TableHead>Odesílatel</TableHead>
            <TableHead>Zpráva</TableHead>
            <TableHead className="text-right">Částka</TableHead>
            <TableHead>
              <span className="sr-only">Akce</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{formatCalendarDate(transaction.bookedOn)}</TableCell>
              <TableCell>
                <span className="font-mono tabular-nums">{transaction.variableSymbol ?? "—"}</span>
              </TableCell>
              <TableCell>
                {transaction.counterpartyName || transaction.counterpartyAccount ? (
                  <>
                    {transaction.counterpartyName ? (
                      <p className="font-medium">{transaction.counterpartyName}</p>
                    ) : null}
                    {transaction.counterpartyAccount ? (
                      <p className="font-mono text-xs text-muted-foreground">
                        {transaction.counterpartyAccount}
                      </p>
                    ) : null}
                  </>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="whitespace-normal">{transaction.message ?? "—"}</TableCell>
              <TableCell className="text-right">
                <Money minor={transaction.amountMinor} />
              </TableCell>
              <TableCell className="text-right">
                <PairTransactionDialog
                  organizationId={organizationId}
                  eventId={eventId}
                  transaction={transaction}
                  onPaired={onPaired}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
