import { useQuery } from "@tanstack/react-query"

import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Skeleton } from "@/components/ui/skeleton"

import { organizerRoommateWishesQueryOptions } from "@/features/registrations/api/roommateWishQueryOptions"

type OrganizerRoommateWishesProps = {
  organizationId: string
  eventId: string
  registrationId: string
}

// Správa akce → Přihlášky → Detail přihlášky → Ubytování (S4-05): the
// participant's wishes to share a room, for the whole event. Read-only: only
// the participant changes them.
export function OrganizerRoommateWishes({
  organizationId,
  eventId,
  registrationId,
}: OrganizerRoommateWishesProps) {
  const query = useQuery(
    organizerRoommateWishesQueryOptions(organizationId, eventId, registrationId),
  )

  if (query.isPending) {
    return (
      <LoadingBlock label="Načítání přání na spolubydlící">
        <Skeleton className="h-10 w-full" />
      </LoadingBlock>
    )
  }
  if (query.isError) {
    return (
      <LoadError
        title="Přání na spolubydlící se nepodařilo načíst"
        isRetrying={query.isFetching}
        onRetry={() => query.refetch()}
      />
    )
  }
  const { wishes } = query.data
  return (
    <DefinitionList layout="stacked">
      <DefinitionRow label="Přání na spolubydlící">
        {wishes.length > 0 ? wishes.map((wish) => wish.name).join(", ") : "Bez přání"}
      </DefinitionRow>
    </DefinitionList>
  )
}
