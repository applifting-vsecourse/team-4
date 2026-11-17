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

// Received transactions as the statement lists them, newest first.
export function BankTransactionsTable({ transactions }: { transactions: BankTransaction[] }) {
  return (
    <Card>
      <div className="-my-6">
        <Table containerLabel="Tabulka přijatých transakcí">
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Variabilní symbol</TableHead>
              <TableHead>Odesílatel</TableHead>
              <TableHead>Zpráva</TableHead>
              <TableHead className="text-right">Částka</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{formatCalendarDate(transaction.bookedOn)}</TableCell>
                <TableCell>
                  <span className="font-mono tabular-nums">
                    {transaction.variableSymbol ?? "—"}
                  </span>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
