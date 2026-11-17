import { Money } from "@/components/Money"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import type { RegistrationBalance } from "@/features/registrations/api/eventRegistrationSchemas"
import { PaymentStateBadge } from "@/features/registrations/components/PaymentStateBadge"
import {
  RegistrationCell,
  RegistrationNameCell,
} from "@/features/registrations/components/RegistrationRowLink"

type RegistrationBalancesTableProps = {
  organizationId: string
  eventId: string
  balances: RegistrationBalance[]
}

// What each registration owes: the same „Celkem“ and „Zaplaceno“ as the
// registration list, and what is left of it. An overpayment is left as a
// negative amount in red.
export function RegistrationBalancesTable({
  organizationId,
  eventId,
  balances,
}: RegistrationBalancesTableProps) {
  return (
    <Card padding="none">
      <Table containerLabel="Tabulka sald přihlášek">
        <TableHeader>
          <TableRow>
            <TableHead>Účastník</TableHead>
            <TableHead className="whitespace-nowrap">Variabilní symbol</TableHead>
            <TableHead className="whitespace-nowrap">Stav platby</TableHead>
            <TableHead className="text-right whitespace-nowrap">Celkem</TableHead>
            <TableHead className="text-right whitespace-nowrap">Zaplaceno</TableHead>
            <TableHead className="text-right whitespace-nowrap">Zbývá zaplatit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {balances.map(({ registration, ...balance }) => {
            const link = { organizationId, eventId, registrationId: registration.id }
            return (
              <TableRow key={registration.id}>
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
                <RegistrationCell link={link}>
                  <PaymentStateBadge state={balance.paymentState} />
                </RegistrationCell>
                <RegistrationCell
                  link={link}
                  isNumeric
                >
                  <Money minor={balance.amountDueMinor} />
                </RegistrationCell>
                <RegistrationCell
                  link={link}
                  isNumeric
                >
                  <Money minor={balance.paidMinor} />
                </RegistrationCell>
                <RegistrationCell
                  link={link}
                  isNumeric
                >
                  {/* An overpayment is a negative amount, in red. */}
                  <span className={balance.balanceMinor < 0 ? "text-destructive" : undefined}>
                    <Money
                      minor={balance.balanceMinor}
                      isEmphasised
                    />
                  </span>
                </RegistrationCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}
