import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Printer, UtensilsCrossed } from "lucide-react"

import { ROUTES } from "@/app/routes"
import { EmptyState } from "@/components/EmptyState"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { PageSection } from "@/components/PageSection"
import { RefreshButton } from "@/components/RefreshButton"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { mealOverviewQueryOptions } from "@/features/meals/api/mealQueryOptions"
import { MealCountsTable } from "@/features/meals/components/MealCountsTable"
import { MealDayList } from "@/features/meals/components/MealDayList"
import { MealLegend } from "@/features/meals/components/MealLegend"
import { MealNotes } from "@/features/meals/components/MealNotes"

type MealsSectionProps = { organizationId: string; eventId: string; termId: string }

// Správa akce → Stravování (S5-04): the meal counts of one term for each day,
// by diet category, and the printout for the kitchen. A failed first load is
// never shown as empty; a failed refresh keeps the last counts and says so.
export function MealsSection({ organizationId, eventId, termId }: MealsSectionProps) {
  const query = useQuery(mealOverviewQueryOptions(organizationId, eventId, termId))
  const { data } = query
  // While the other term loads, the previous counts stay but are not acted on.
  const isStale = Boolean(data) && data?.termId !== termId

  return (
    <PageSection
      title="Denní počty strávníků"
      isBusy={query.isFetching}
      actions={
        <>
          <RefreshButton
            isRefreshing={query.isFetching}
            onRefresh={() => query.refetch()}
          />
          {data && data.participants > 0 ? (
            <Button
              variant="outline"
              disabled={isStale}
              onClick={() => window.print()}
            >
              <Printer aria-hidden="true" />
              Vytisknout
            </Button>
          ) : null}
        </>
      }
    >
      {query.isError ? (
        <LoadError
          title={data ? "Aktualizace se nezdařila" : "Stravování se nepodařilo načíst"}
          shownFrom={data ? query.dataUpdatedAt : undefined}
          isRetrying={query.isFetching}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {data ? (
        data.participants === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="V termínu zatím nejsou potvrzení účastníci"
            description="Počty se objeví po potvrzení první přihlášky."
            action={
              <Button
                asChild
                variant="outline"
              >
                <Link
                  to={ROUTES.eventRegistrations}
                  params={{ organizationId, eventId }}
                >
                  Přejít na přihlášky
                </Link>
              </Button>
            }
          />
        ) : (
          <div
            inert={isStale}
            className="space-y-8"
          >
            <MealDayList overview={data} />
            <div className="hidden space-y-3 md:block">
              <MealLegend overview={data} />
              <Card>
                <div className="-my-6">
                  <MealCountsTable
                    overview={data}
                    containerLabel="Tabulka stravování po dnech"
                  />
                </div>
              </Card>
            </div>
            {data.notes.length > 0 ? (
              <MealNotes
                organizationId={organizationId}
                eventId={eventId}
                notes={data.notes}
              />
            ) : null}
          </div>
        )
      ) : query.isPending ? (
        <LoadingBlock
          label="Načítání stravování"
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
