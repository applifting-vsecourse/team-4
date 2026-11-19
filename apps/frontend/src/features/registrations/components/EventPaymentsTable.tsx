import { useState } from "react"

import { Money } from "@/components/Money"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table"
import { formatCalendarDate } from "@/lib/date"

import type { EventPayment } from "@/features/registrations/api/eventRegistrationSchemas"
import {
  RegistrationCell,
  RegistrationNameCell,
} from "@/features/registrations/components/RegistrationRowLink"
import {
  nextSort,
  SortableTableHead,
  type SortDirection,
} from "@/features/registrations/components/SortableTableHead"

type EventPaymentsTableProps = {
  organizationId: string
  eventId: string
  payments: EventPayment[]
}

type SortKey = "date" | "participant" | "variableSymbol" | "amount"

const COLUMNS: { key: SortKey; label: string; isNumeric: boolean }[] = [
  { key: "date", label: "Datum", isNumeric: false },
  { key: "participant", label: "Účastník", isNumeric: false },
  { key: "variableSymbol", label: "Variabilní symbol", isNumeric: false },
  { key: "amount", label: "Částka", isNumeric: true },
]

function compare(a: EventPayment, b: EventPayment, key: SortKey) {
  switch (key) {
    case "date":
      return a.receivedOn.localeCompare(b.receivedOn)
    case "participant":
      return (
        a.registration.lastName.localeCompare(b.registration.lastName, "cs") ||
        a.registration.firstName.localeCompare(b.registration.firstName, "cs")
      )
    case "variableSymbol":
      return (a.registration.variableSymbol ?? "").localeCompare(
        b.registration.variableSymbol ?? "",
      )
    case "amount":
      return a.amountMinor - b.amountMinor
  }
}

// Received payments of the event, sortable by every column and newest first by
// default; each opens its registration. A payment through the QR link is marked
// as in the registration detail.
export function EventPaymentsTable({ organizationId, eventId, payments }: EventPaymentsTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "date",
    direction: "desc",
  })
  const sign = sort.direction === "asc" ? 1 : -1
  // Equal values keep the order the server sent (newest first).
  const sorted = [...payments].sort((a, b) => sign * compare(a, b, sort.key))

  return (
    <Card padding="none">
      <Table containerLabel="Tabulka přijatých plateb">
        <TableHeader>
          <TableRow>
            {COLUMNS.map(({ key, label, isNumeric }) => (
              <SortableTableHead
                key={key}
                label={label}
                isNumeric={isNumeric}
                direction={sort.key === key ? sort.direction : null}
                onSort={() => setSort(nextSort(sort, key, key === "date" ? "desc" : "asc"))}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(({ registration, ...payment }) => {
            const link = { organizationId, eventId, registrationId: registration.id }
            return (
              <TableRow key={payment.id}>
                <RegistrationCell link={link}>
                  <span className="flex items-center gap-2">
                    {formatCalendarDate(payment.receivedOn)}
                    {payment.source === "qr_link" ? (
                      <Badge variant="secondary">QR platba</Badge>
                    ) : null}
                  </span>
                </RegistrationCell>
                <RegistrationNameCell
                  link={link}
                  firstName={registration.firstName}
                  lastName={registration.lastName}
                />
                <RegistrationCell link={link}>
                  <span className="font-mono tabular-nums">
                    {registration.variableSymbol ?? "—"}
                  </span>
                </RegistrationCell>
                <RegistrationCell
                  link={link}
                  isNumeric
                >
                  <Money minor={payment.amountMinor} />
                </RegistrationCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}
