import { useQuery } from "@tanstack/react-query"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Skeleton } from "@/components/ui/skeleton"

import { evaluationModeQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { roomProposalModeQueryOptions } from "@/features/accommodation/api/roomProposalQueryOptions"
import { AutomationSettings } from "@/features/accommodation/components/AutomationSettings"
import { useSaveEvaluationMode } from "@/features/accommodation/hooks/useSaveEvaluationMode"
import { useSaveRoomProposalMode } from "@/features/accommodation/hooks/useSaveRoomProposalMode"

// Nastavení → Automatizace: the two independently saved modes share one form.
export function EvaluationModeSection({
  organizationId,
  eventId,
}: {
  organizationId: string
  eventId: string
}) {
  const evaluation = useQuery(evaluationModeQueryOptions(organizationId, eventId))
  const rooms = useQuery(roomProposalModeQueryOptions(organizationId, eventId))
  const saveEvaluation = useSaveEvaluationMode(organizationId, eventId)
  const saveRooms = useSaveRoomProposalMode(organizationId, eventId)

  const content =
    evaluation.isPending || rooms.isPending ? (
      <LoadingBlock label="Načítání automatizace">
        <Skeleton className="h-52 w-full" />
      </LoadingBlock>
    ) : evaluation.isError || rooms.isError ? (
      <LoadError
        title="Automatizaci se nepodařilo načíst"
        isRetrying={evaluation.isFetching || rooms.isFetching}
        onRetry={() => {
          void evaluation.refetch()
          void rooms.refetch()
        }}
      />
    ) : (
      <AutomationSettings
        evaluationMode={evaluation.data}
        roomProposalMode={rooms.data}
        saveEvaluationMode={(mode) => saveEvaluation.mutateAsync(mode)}
        saveRoomProposalMode={(mode) => saveRooms.mutateAsync(mode)}
      />
    )

  return (
    <CollapsibleSection
      headingId="automation-heading"
      title="Automatizace"
      alwaysOpen
    >
      {content}
    </CollapsibleSection>
  )
}
