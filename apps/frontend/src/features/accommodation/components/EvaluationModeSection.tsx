import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { LoadError } from "@/components/LoadError"
import { LoadingBlock } from "@/components/LoadingBlock"
import { CollapsibleSection } from "@/components/ui/collapsible-section"
import { Skeleton } from "@/components/ui/skeleton"

import { evaluationModeQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { EvaluationModeSettings } from "@/features/accommodation/components/EvaluationModeSettings"
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
  children,
}: {
  organizationId: string
  eventId: string
  /** Further automation of the event beside the evaluation mode, e.g. room proposals. */
  children?: ReactNode
}) {
  const mode = useQuery(evaluationModeQueryOptions(organizationId, eventId))
  const save = useSaveEvaluationMode(organizationId, eventId)

  const content = mode.isPending ? (
    <LoadingBlock label="Načítání automatizace">
      <Skeleton className="h-40 w-full" />
    </LoadingBlock>
  ) : mode.isError ? (
    <LoadError
      title="Automatizaci se nepodařilo načíst"
      isRetrying={mode.isFetching}
      onRetry={() => mode.refetch()}
    />
  ) : (
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

  return (
    <CollapsibleSection
      headingId="automation-heading"
      title="Automatizace"
    >
      <div className="space-y-4">
        {content}
        {children}
      </div>
    </CollapsibleSection>
  )
}
