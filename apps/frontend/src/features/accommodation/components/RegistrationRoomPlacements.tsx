import { useQueries } from "@tanstack/react-query"

import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCalendarRange } from "@/lib/date"

import { placementsQueryOptions } from "@/features/accommodation/api/placementQueryOptions"

type PlacedTerm = { termId: string; label: string; startDate: string; endDate: string }

type RegistrationRoomPlacementsProps = {
  organizationId: string
  eventId: string
  registrationId: string
  /** Only a confirmed term has a room. */
  confirmedTerms: PlacedTerm[]
}

// Detail přihlášky → Ubytování (F38-1): the room of the registration in each of
// its confirmed terms, as saved on the room board. A failed read is an error,
// never "no room".
export function RegistrationRoomPlacements({
  organizationId,
  eventId,
  registrationId,
  confirmedTerms,
}: RegistrationRoomPlacementsProps) {
  const queries = useQueries({
    queries: confirmedTerms.map((term) =>
      placementsQueryOptions(organizationId, eventId, term.termId),
    ),
  })

  if (confirmedTerms.length === 0) {
    return (
      <section
        aria-label="Přiřazení pokojů"
        className="space-y-3 border-t border-border pt-4"
      >
        <h2 className="text-sm font-semibold">Přiřazení pokojů</h2>
        <p className="text-sm text-muted-foreground">
          Pokoj lze přidělit až po potvrzení účasti v termínu.
        </p>
      </section>
    )
  }

  return (
    <section
      aria-label="Přiřazení pokojů"
      className="space-y-3 border-t border-border pt-4"
    >
      <h2 className="text-sm font-semibold">Přiřazení pokojů</h2>
      <DefinitionList>
        {confirmedTerms.map((term, index) => {
          const query = queries[index]
          const label = `${term.label}, ${formatCalendarRange(term.startDate, term.endDate)}`
          if (query?.isError) {
            return (
              <DefinitionRow
                key={term.termId}
                label={label}
              >
                <LoadError
                  title="Přiřazení pokojů se nepodařilo načíst"
                  isRetrying={query.isFetching}
                  onRetry={() => query.refetch()}
                />
              </DefinitionRow>
            )
          }
          if (!query?.data) {
            return (
              <DefinitionRow
                key={term.termId}
                label={label}
              >
                <LoadingBlock label="Načítání přiřazení pokojů">
                  <Skeleton className="h-5 w-32" />
                </LoadingBlock>
              </DefinitionRow>
            )
          }
          const person = query.data.people.find((entry) => entry.registrationId === registrationId)
          const room = query.data.rooms.find((entry) => entry.id === person?.roomId)
          return (
            <DefinitionRow
              key={term.termId}
              label={label}
            >
              {room ? room.label : "Pokoj zatím není přidělen"}
            </DefinitionRow>
          )
        })}
      </DefinitionList>
    </section>
  )
}
