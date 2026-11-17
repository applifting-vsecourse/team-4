import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Banknote, Upload, WalletCards } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/EmptyState"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PageSection } from "@/components/PageSection"
import { RefreshButton } from "@/components/RefreshButton"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { eventPaymentsQueryOptions } from "@/features/registrations/api/eventRegistrationQueryOptions"
import type { EventPayments } from "@/features/registrations/api/eventRegistrationSchemas"
import { EventPaymentsTable } from "@/features/registrations/components/EventPaymentsTable"
import { RegistrationBalancesTable } from "@/features/registrations/components/RegistrationBalancesTable"

type PaymentsOverviewSectionProps = {
  organizationId: string
  eventId: string
  /** The id of the statement import's heading on the same page, where an empty overview points. */
  statementImportHeadingId: string
}

// Správa akce → Platby (S4-09): who has paid and who still owes, and the
// payments received so far. A failed first load is never shown as empty; a
// failed refresh keeps the last overview and says so.
export function PaymentsOverviewSection({
  organizationId,
  eventId,
  statementImportHeadingId,
}: PaymentsOverviewSectionProps) {
  const query = useQuery(eventPaymentsQueryOptions(organizationId, eventId))
  const { data } = query

  return (
    <PageSection
      title="Přijaté platby a salda"
      isBusy={query.isFetching && !query.isPending}
      actions={
        <RefreshButton
          isRefreshing={query.isFetching}
          onRefresh={() => query.refetch()}
        />
      }
    >
      {query.isError ? (
        <LoadError
          title={data ? "Aktualizace se nezdařila" : "Platby se nepodařilo načíst"}
          shownFrom={data ? query.dataUpdatedAt : undefined}
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {data ? (
        <Overview
          organizationId={organizationId}
          eventId={eventId}
          statementImportHeadingId={statementImportHeadingId}
          overview={data}
        />
      ) : query.isPending ? (
        <LoadingBlock
          label="Načítání plateb"
          className="space-y-2"
        >
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </LoadingBlock>
      ) : null}
    </PageSection>
  )
}

type OverviewProps = PaymentsOverviewSectionProps & { overview: EventPayments }

function Overview({ organizationId, eventId, statementImportHeadingId, overview }: OverviewProps) {
  const balancesHeadingId = useId()
  const paymentsHeadingId = useId()
  return (
    <div className="space-y-6">
      <section
        aria-labelledby={balancesHeadingId}
        className="space-y-3"
      >
        <h3
          id={balancesHeadingId}
          className="text-sm font-semibold"
        >
          Salda přihlášek
        </h3>
        {overview.balances.length === 0 ? (
          <EmptyState
            icon={WalletCards}
            title="Žádná přihláška zatím nemá platební povinnost"
          />
        ) : (
          <RegistrationBalancesTable
            organizationId={organizationId}
            eventId={eventId}
            balances={overview.balances}
          />
        )}
      </section>

      <section
        aria-labelledby={paymentsHeadingId}
        className="space-y-3"
      >
        <h3
          id={paymentsHeadingId}
          className="text-sm font-semibold"
        >
          Přijaté platby
        </h3>
        {overview.payments.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="Zatím žádné přijaté platby"
            action={
              <Button
                asChild
                variant="outline"
              >
                <Link
                  to={ROUTES.eventPayments}
                  params={{ organizationId, eventId }}
                  hash={statementImportHeadingId}
                  resetScroll={false}
                >
                  <Upload />
                  Přejít na import výpisu
                </Link>
              </Button>
            }
          />
        ) : (
          <EventPaymentsTable
            organizationId={organizationId}
            eventId={eventId}
            payments={overview.payments}
          />
        )}
      </section>
    </div>
  )
}
