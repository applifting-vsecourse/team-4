import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { Skeleton } from "@/components/ui/skeleton"

import { roomProposalModeQueryOptions } from "@/features/accommodation/api/roomProposalQueryOptions"
import { RoomProposalModeSettings } from "@/features/accommodation/components/RoomProposalModeSettings"
import { useSaveRoomProposalMode } from "@/features/accommodation/hooks/useSaveRoomProposalMode"

const STILL_APPLIES = {
  automatic: "Pokoje se dál navrhují automaticky.",
  manual: "Pokoje se dál navrhují jen ručně.",
}

// Nastavení → Automatizace (#385): the saved room proposal mode of the event,
// beside the evaluation mode. Saving proposes nothing by itself; a failed save
// says which mode applies.
export function RoomProposalModeSection({
  organizationId,
  eventId,
}: {
  organizationId: string
  eventId: string
}) {
  const mode = useQuery(roomProposalModeQueryOptions(organizationId, eventId))
  const save = useSaveRoomProposalMode(organizationId, eventId)

  if (mode.isPending) {
    return (
      <LoadingBlock label="Načítání režimu návrhu pokojů">
        <Skeleton className="h-40 w-full" />
      </LoadingBlock>
    )
  }
  if (mode.isError) {
    return (
      <LoadError
        title="Režim návrhu pokojů se nepodařilo načíst"
        isRetrying={mode.isFetching}
        onRetry={() => mode.refetch()}
      />
    )
  }
  return (
    <RoomProposalModeSettings
      // A newly saved or reloaded mode starts the form again.
      key={mode.data}
      mode={mode.data}
      isSaving={save.isPending}
      saveError={save.isError ? STILL_APPLIES[mode.data] : undefined}
      onSave={(next) =>
        save.mutate(next, {
          onSuccess: () => toast.success("Režim návrhu pokojů byl uložen."),
        })
      }
    />
  )
}
