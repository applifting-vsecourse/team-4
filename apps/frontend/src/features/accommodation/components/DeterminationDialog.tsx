import { toast } from "sonner"

import { readApiError } from "@/lib/apiError"

import { ManualDeterminationDialog } from "@/features/accommodation/components/ManualDeterminationDialog"
import { useDetermine } from "@/features/accommodation/hooks/useDetermine"
import { valueLabel } from "@/features/accommodation/lib/evaluationView"

export type DeterminationTarget = {
  registrationId: string
  /** E.g. "Alex Šimek". */
  person: string
  /** The participant's answer as the API stores it, e.g. `undisclosed`. */
  answer: string | null
  /** The valid determination being replaced, as the API stores it. */
  current: string | null
}

type DeterminationDialogProps = {
  organizationId: string
  eventId: string
  /** The hard attribute and the values a room can carry. */
  hardAttribute: { attribute: string; determiningValues: string[] }
  target: DeterminationTarget
  onClose: () => void
  /** Also reloaded on success, e.g. the registration detail. */
  invalidate?: readonly unknown[]
}

/** A refused or failed save; the earlier determination stays. */
function describeError(error: unknown) {
  const { code, message } = readApiError(error)
  // The participant's answer changed, or the answer already places them.
  if (code && message) return message
  return "Původní určení platí dál. Zkuste to prosím znovu."
}

// Určit ubytování (spec v4 §4), from the order of a term or the registration
// detail: the effective value of a person whose answer places nobody, with a
// reason, for every term of the registration. The answer itself stays.
export function DeterminationDialog({
  organizationId,
  eventId,
  hardAttribute,
  target,
  onClose,
  invalidate,
}: DeterminationDialogProps) {
  const determine = useDetermine(organizationId, eventId, target.registrationId, invalidate)
  const label = (value: string) => valueLabel(hardAttribute.attribute, value)
  const codeOf = new Map(hardAttribute.determiningValues.map((value) => [label(value), value]))

  return (
    <ManualDeterminationDialog
      isOpen
      person={target.person}
      isChange={target.current !== null}
      answer={valueLabel(hardAttribute.attribute, target.answer)}
      values={hardAttribute.determiningValues.map(label)}
      value={target.current ? label(target.current) : undefined}
      saveError={determine.isError ? describeError(determine.error) : undefined}
      isSaving={determine.isPending}
      onOpenChange={(isOpen) => (isOpen ? undefined : onClose())}
      onSubmit={({ value, reason }) =>
        determine.mutate(
          { value: codeOf.get(value) ?? value, reason, answer: target.answer },
          {
            onSuccess: () => {
              toast.success("Určení ubytování bylo uloženo.")
              onClose()
            },
          },
        )
      }
    />
  )
}
