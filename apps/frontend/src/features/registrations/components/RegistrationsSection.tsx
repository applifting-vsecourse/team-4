import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ClipboardList, X } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PageSection } from "@/components/PageSection"
import { RefreshButton } from "@/components/RefreshButton"
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

// The registrations of one event, oldest first, with combined filters (S2-11). "Aktualizovat" reloads with the same filters; a failed
// reload keeps the last list and says so, and a failed first load is never
// shown as an empty one.
export function RegistrationsSection({
  organizationId,
  eventId,
  terms,
  filter,
  onFilterChange,
}: RegistrationsSectionProps) {
  // Another filter keeps the previous rows until its own arrive, so the page
  // does not shrink and move the organizer away from the filters (S4-01).
  const query = useQuery({
    ...eventRegistrationsQueryOptions(organizationId, eventId, filter),
    placeholderData: keepPreviousData,
  })
  const { data } = query

  return (
    <PageSection
      title="Seznam přihlášek"
      isBusy={query.isFetching}
      actions={
        <RefreshButton
          isRefreshing={query.isFetching}
          onRefresh={() => query.refetch()}
        />
      }
    >
      <RegistrationFilters
        terms={terms}
        filter={filter}
        onChange={onFilterChange}
      />

      {query.isError ? (
        <LoadError
          shownFrom={data ? query.dataUpdatedAt : undefined}
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
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
        <LoadingBlock
          label="Načítání přihlášek"
          className="space-y-2"
        >
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </LoadingBlock>
      ) : null}

      {data && !query.isError ? (
        <p className="text-sm text-muted-foreground">
          Aktualizováno {formatPragueDateTime(new Date(query.dataUpdatedAt).toISOString())}
        </p>
      ) : null}
    </PageSection>
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
        <Table containerLabel="Tabulka přihlášek">
          <TableHeader>
            <TableRow>
              <TableHead>Účastník</TableHead>
              <TableHead>Termíny</TableHead>
              <TableHead className="whitespace-nowrap">Přijato</TableHead>
              <TableHead>Platba</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map((registration) => {
              const balance = describeBalance(registration.balanceMinor)
              return (
                <TableRow key={registration.id}>
                  <TableCell className="relative">
                    <Link
                      to={ROUTES.registration}
                      params={{ organizationId, eventId, registrationId: registration.id }}
                      aria-label={`Přihláška ${registration.firstName} ${registration.lastName}`}
                      className="block font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                    >
                      {registration.firstName} {registration.lastName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{registration.email}</p>
                    <p className="text-xs text-muted-foreground">{registration.phone}</p>
                  </TableCell>
                  <TableCell className="relative">
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
                    <Link
                      to={ROUTES.registration}
                      params={{ organizationId, eventId, registrationId: registration.id }}
                      aria-hidden="true"
                      tabIndex={-1}
                      className="absolute inset-0"
                    />
                  </TableCell>
                  <TableCell className="relative whitespace-nowrap">
                    {formatPragueDateTime(registration.receivedAt)}
                    <Link
                      to={ROUTES.registration}
                      params={{ organizationId, eventId, registrationId: registration.id }}
                      aria-hidden="true"
                      tabIndex={-1}
                      className="absolute inset-0"
                    />
                  </TableCell>
                  <TableCell className="relative whitespace-nowrap">
                    <div className="-ml-2">
                      <PaymentStateBadge state={registration.paymentState} />
                    </div>
                    {balance.amount ? (
                      <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
                        {balance.label} {balance.amount}
                      </p>
                    ) : null}
                    <Link
                      to={ROUTES.registration}
                      params={{ organizationId, eventId, registrationId: registration.id }}
                      aria-hidden="true"
                      tabIndex={-1}
                      className="absolute inset-0"
                    />
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
