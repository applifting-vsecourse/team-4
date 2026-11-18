import { useState } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { Money } from "@/components/Money"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCalendarDate } from "@/lib/date"

import { type RegistrationDetail } from "@/features/registrations/api/eventRegistrationSchemas"

type Payment = RegistrationDetail["payments"][number]
type SortKey = "date" | "amount"
type Direction = "asc" | "desc"

const COLUMNS: { key: SortKey; label: string; isNumeric: boolean }[] = [
  { key: "date", label: "Datum", isNumeric: false },
  { key: "amount", label: "Částka", isNumeric: true },
]

function compare(a: Payment, b: Payment, key: SortKey) {
  return key === "date"
    ? a.receivedOn.localeCompare(b.receivedOn) || a.amountMinor - b.amountMinor
    : a.amountMinor - b.amountMinor || a.receivedOn.localeCompare(b.receivedOn)
}

// Přijaté platby of one registration, sortable by date and amount; newest first
// by default. A payment through the QR link is marked, as in the event overview.
export function ReceivedPaymentsTable({ payments }: { payments: Payment[] }) {
  const [sort, setSort] = useState<{ key: SortKey; direction: Direction }>({
    key: "date",
    direction: "desc",
  })

  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">Zatím nebyla zaznamenána žádná platba.</p>
  }

  const sign = sort.direction === "asc" ? 1 : -1
  const sorted = [...payments].sort((a, b) => sign * compare(a, b, sort.key))

  function toggle(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "date" ? "desc" : "asc" },
    )
  }

  return (
    <Table containerLabel="Tabulka přijatých plateb">
      <TableHeader>
        <TableRow>
          {COLUMNS.map(({ key, label, isNumeric }) => {
            const isActive = sort.key === key
            const Icon = !isActive ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown
            return (
              <TableHead
                key={key}
                className={isNumeric ? "text-right" : undefined}
                aria-sort={
                  isActive ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
                }
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggle(key)}
                >
                  {label}
                  <Icon aria-hidden="true" />
                </Button>
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell>
              <span className="flex items-center gap-2">
                {formatCalendarDate(payment.receivedOn)}
                {payment.source === "qr_link" ? <Badge variant="secondary">QR platba</Badge> : null}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <Money minor={payment.amountMinor} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
