import { useId } from "react"
import { useQuery } from "@tanstack/react-query"

import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Notice } from "@/components/Notice"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCalendarRange } from "@/lib/date"

import { participantPlacementsQueryOptions } from "@/features/accommodation/api/participantPlacementQueryOptions"
import type { ParticipantTermPlacement } from "@/features/accommodation/api/participantPlacementSchemas"
import { wishStateBadge } from "@/features/accommodation/lib/roomProposalView"

type ParticipantRoomPlacementsProps = {
  registrationId: string
  /** The confirmed terms of the registration as the detail shows them. */
  confirmedTermIds: readonly string[]
}

// Moje přihlášky → Detail přihlášky → Rozdělení pokojů (S4-02): the own room
// and the state of the own roommate wishes of each confirmed term. A term
// whose rooms the organizer has not published shows neither; a failed load
// is an error, never "not published" or "no room".
export function ParticipantRoomPlacements({
  registrationId,
  confirmedTermIds,
}: ParticipantRoomPlacementsProps) {
  const query = useQuery(participantPlacementsQueryOptions(registrationId, confirmedTermIds))

  return (
    <Card>
      <CardHeader>
        <h2 className="text-h4">Rozdělení pokojů</h2>
      </CardHeader>
      <CardContent>
        {query.isError ? (
          <LoadError
            title="Rozdělení pokojů se nepodařilo načíst"
            onRetry={query.refetch}
            isRetrying={query.isFetching}
          />
        ) : !query.data ? (
          <LoadingBlock label="Načítání rozdělení pokojů">
            <Skeleton className="h-20 w-full" />
          </LoadingBlock>
        ) : (
          <div className="space-y-6">
            {query.data.terms.map((term) => (
              <TermPlacement
                key={term.termId}
                term={term}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TermPlacement({ term }: { term: ParticipantTermPlacement }) {
  const headingId = useId()
  const wishesId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 not-first:border-t not-first:border-border not-first:pt-6"
    >
      <div className="space-y-1">
        <h3
          id={headingId}
          className="text-sm font-semibold wrap-break-word"
        >
          {term.label}
        </h3>
        <p className="text-sm text-muted-foreground">
          {formatCalendarRange(term.startDate, term.endDate)}
        </p>
      </div>
      {!term.isPublished ? (
        <Notice
          tone="info"
          title="Rozdělení pokojů zatím není zveřejněné."
        />
      ) : (
        <>
          <DefinitionList>
            <DefinitionRow label="Pokoj">
              {term.room ? (
                <span className="font-medium wrap-break-word">{term.room.label}</span>
              ) : (
                "Pokoj zatím není přidělen"
              )}
            </DefinitionRow>
          </DefinitionList>
          <div className="space-y-2">
            <h4
              id={wishesId}
              className="text-sm text-muted-foreground"
            >
              Přání na spolubydlící
            </h4>
            {term.wishes.length === 0 ? (
              <p className="text-sm">Pro tento termín nemáte žádné přání na spolubydlící.</p>
            ) : (
              <ul
                aria-labelledby={wishesId}
                className="space-y-2"
              >
                {term.wishes.map((wish) => {
                  const badge = wishStateBadge(wish.state)
                  return (
                    <li
                      key={wish.registrationId}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm"
                    >
                      <span className="min-w-0 wrap-break-word">{wish.name}</span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
