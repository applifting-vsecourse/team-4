import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ClipboardList, Loader2, RefreshCw, X } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPragueDateTime } from "@/lib/date"

import { eventRegistrationsQueryOptions } from "@/features/registrations/api/eventRegistrationQueryOptions"
import {
  type RegistrationFilter,
  type RegistrationSummary,
} from "@/features/registrations/api/eventRegistrationSchemas"
import { ParticipationBadge } from "@/features/registrations/components/ParticipationBadge"
import { PaymentStateBadge } from "@/features/registrations/components/PaymentStateBadge"
import { RegistrationFilters } from "@/features/registrations/components/RegistrationFilters"
import { describeBalance } from "@/features/registrations/lib/balance"

type RegistrationsSectionProps = {
  organizationId: string
  eventId: string
  /** Terms of the event, offered by the term filter. */
  terms: { id: string; label: string }[]
  filter: RegistrationFilter
  onFilterChange: (filter: RegistrationFilter) => void
}

// The registrations of one event, oldest first, with combined filters (S2-11,
// Wireframy W04). "Aktualizovat" reloads with the same filters; a failed
// reload keeps the last list and says so, and a failed first load is never
// shown as an empty one.
export function RegistrationsSection({
  organizationId,
  eventId,
  terms,
  filter,
  onFilterChange,
}: RegistrationsSectionProps) {
  const query = useQuery(eventRegistrationsQueryOptions(organizationId, eventId, filter))
  const { data } = query

  return (
    <section
      aria-labelledby="registrations-heading"
      aria-busy={query.isFetching}
      className="space-y-4"
    >
      <div className="flex min-h-9 items-center justify-between gap-4">
        <h2
          id="registrations-heading"
          className="text-h4"
        >
          Seznam přihlášek
        </h2>
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw />}
          {query.isFetching ? "Aktualizuji…" : "Aktualizovat"}
        </Button>
      </div>

      <RegistrationFilters
        terms={terms}
        filter={filter}
        onChange={onFilterChange}
      />

      {query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Data se nepodařilo načíst. Zkuste to znovu.</AlertTitle>
          <AlertDescription>
            {data ? (
              <p>
                Zobrazený seznam je z posledního úspěšného načtení (
                {formatPragueDateTime(new Date(query.dataUpdatedAt).toISOString())}).
              </p>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              Zkusit znovu
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {data ? (
        <RegistrationsResult
          organizationId={organizationId}
          eventId={eventId}
          total={data.total}
          registrations={data.registrations}
          onClearFilters={() => onFilterChange({})}
        />
      ) : query.isPending ? (
        <div
          className="space-y-2"
          aria-label="Načítání přihlášek"
        >
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {data && !query.isError ? (
        <p className="text-sm text-muted-foreground">
          Aktualizováno {formatPragueDateTime(new Date(query.dataUpdatedAt).toISOString())}
        </p>
      ) : null}
    </section>
  )
}

type RegistrationsResultProps = {
  organizationId: string
  eventId: string
  total: number
  registrations: RegistrationSummary[]
  onClearFilters: () => void
}

function RegistrationsResult({
  organizationId,
  eventId,
  total,
  registrations,
  onClearFilters,
}: RegistrationsResultProps) {
  if (total === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList />
          </EmptyMedia>
          <EmptyTitle>Tato akce zatím nemá žádné přihlášky.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  if (registrations.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Žádná přihláška neodpovídá filtrům.</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onClearFilters}>
            <X />
            Zrušit filtry
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Zobrazeno {registrations.length} z {total} · od nejstarší přihlášky
      </p>
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Účastník</TableHead>
              <TableHead>Termíny</TableHead>
              <TableHead>Přijato</TableHead>
              <TableHead>Platba</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map((registration) => {
              const balance = describeBalance(registration.balanceMinor)
              return (
                <TableRow key={registration.id}>
                  <TableCell>
                    <Link
                      to={ROUTES.registration}
                      params={{ organizationId, eventId, registrationId: registration.id }}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {registration.firstName} {registration.lastName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{registration.email}</p>
                    <p className="text-xs text-muted-foreground">{registration.phone}</p>
                  </TableCell>
                  <TableCell>
                    <ul className="space-y-1">
                      {registration.terms.map((term) => (
                        <li
                          key={term.termId}
                          className="flex items-center gap-2"
                        >
                          <span>{term.label}</span>
                          <ParticipationBadge status={term.status} />
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell>{formatPragueDateTime(registration.receivedAt)}</TableCell>
                  <TableCell>
                    <PaymentStateBadge state={registration.paymentState} />
                    {balance.amount ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {balance.label} {balance.amount}
                      </p>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
