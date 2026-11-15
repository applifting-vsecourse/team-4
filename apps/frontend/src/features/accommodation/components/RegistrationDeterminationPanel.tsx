import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"
import { LoadError } from "@/components/LoadError"
import { Button } from "@/components/ui/button"
import { formatPragueDateTime } from "@/lib/date"

import { registrationAccommodationQueryOptions } from "@/features/accommodation/api/evaluationQueryOptions"
import { DeterminationDialog } from "@/features/accommodation/components/DeterminationDialog"
import { valueLabel } from "@/features/accommodation/lib/evaluationView"

type RegistrationDeterminationPanelProps = {
  organizationId: string
  eventId: string
  registrationId: string
  /** E.g. "Alex Šimek". */
  person: string
  /** Reloaded after a determination, e.g. the detail with its F64 notice. */
  invalidate: readonly unknown[]
}

// Detail přihlášky → Ubytování (spec v4 §4): the organizer's determination of
// the accommodation, valid for every term, and the way to make or change it.
// Without a hard attribute nobody needs one, so nothing is shown.
export function RegistrationDeterminationPanel({
  organizationId,
  eventId,
  registrationId,
  person,
  invalidate,
}: RegistrationDeterminationPanelProps) {
  const accommodation = useQuery(
    registrationAccommodationQueryOptions(organizationId, eventId, registrationId),
  )
  const [isOpen, setIsOpen] = useState(false)

  if (accommodation.isPending) return null
  if (accommodation.isError) {
    return (
      <LoadError
        title="Určení ubytování se nepodařilo načíst"
        isRetrying={accommodation.isFetching}
        onRetry={() => accommodation.refetch()}
      />
    )
  }
  const { hardAttribute, determination, answer } = accommodation.data
  const isNeeded = accommodation.data.needsDetermination
  if (!hardAttribute) return null
  const valid = determination?.isValid ? determination : null
  if (!valid && !isNeeded) return null

  return (
    <div className="space-y-3">
      {valid ? (
        <DefinitionList layout="stacked">
          <DefinitionRow label="Ubytovat jako">
            {valueLabel(hardAttribute.attribute, valid.value)}, všechny termíny
          </DefinitionRow>
          <DefinitionRow label="Důvod určení">{valid.reason}</DefinitionRow>
          <DefinitionRow label="Určil(a)">
            {valid.createdBy.name}, {formatPragueDateTime(valid.createdAt)}
          </DefinitionRow>
        </DefinitionList>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        {valid ? "Změnit určení" : "Určit ubytování"}
      </Button>
      {isOpen ? (
        <DeterminationDialog
          organizationId={organizationId}
          eventId={eventId}
          hardAttribute={hardAttribute}
          target={{ registrationId, person, answer, current: valid?.value ?? null }}
          onClose={() => setIsOpen(false)}
          invalidate={invalidate}
        />
      ) : null}
    </div>
  )
}
