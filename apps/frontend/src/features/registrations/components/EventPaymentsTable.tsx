import { Money } from "@/components/Money"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCalendarDate } from "@/lib/date"

import type { EventPayment } from "@/features/registrations/api/eventRegistrationSchemas"
import {
  RegistrationCell,
  RegistrationNameCell,
} from "@/features/registrations/components/RegistrationRowLink"

type EventPaymentsTableProps = {
  organizationId: string
  eventId: string
  payments: EventPayment[]
}

// Received payments of the event, newest first; each opens its registration.
// A payment through the QR link is marked as in the registration detail.
export function EventPaymentsTable({ organizationId, eventId, payments }: EventPaymentsTableProps) {
  return (
    <Card padding="none">
      <Table containerLabel="Tabulka přijatých plateb">
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Účastník</TableHead>
            <TableHead className="whitespace-nowrap">Variabilní symbol</TableHead>
            <TableHead className="text-right">Částka</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map(({ registration, ...payment }) => {
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
