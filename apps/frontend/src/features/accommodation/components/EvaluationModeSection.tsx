import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { Skeleton } from "@/components/ui/skeleton"

import { evaluationModeQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { EvaluationModeSettings } from "@/features/accommodation/components/EvaluationModeSettings"
import { RetryAlert } from "@/features/accommodation/components/RetryAlert"
import { useSaveEvaluationMode } from "@/features/accommodation/hooks/useSaveEvaluationMode"

const STILL_APPLIES = {
  automatic: "Platí dál automatický přepočet.",
  manual: "Platí dál přepočet jen tlačítkem Přepočítat.",
}

// Nastavení → Automatizace (S3-01): the saved evaluation mode of the event.
// Saving evaluates nothing by itself; a failed save says which mode applies.
export function EvaluationModeSection({
  organizationId,
  eventId,
}: {
  organizationId: string
  eventId: string
}) {
  const mode = useQuery(evaluationModeQueryOptions(organizationId, eventId))
  const save = useSaveEvaluationMode(organizationId, eventId)

  if (mode.isPending) {
    return (
      <Skeleton
        className="h-40 w-full"
        role="status"
        aria-label="Načítání automatizace"
      />
    )
  }
  if (mode.isError) {
    return (
      <RetryAlert
        title="Automatizaci se nepodařilo načíst"
        onRetry={() => void mode.refetch()}
      />
    )
  }
  return (
    <EvaluationModeSettings
      // A newly saved or reloaded mode starts the form again.
      key={mode.data}
      mode={mode.data}
      isSaving={save.isPending}
      saveError={save.isError ? STILL_APPLIES[mode.data] : undefined}
      onSave={(next) =>
        save.mutate(next, { onSuccess: () => toast.success("Režim vyhodnocení byl uložen.") })
      }
    />
  )
}
