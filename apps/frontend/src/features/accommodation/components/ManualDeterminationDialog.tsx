import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  DeterminationFields,
  type DeterminationFieldsProps,
} from "@/features/accommodation/components/DeterminationFields"
import { ErrorAlert } from "@/features/accommodation/components/ErrorAlert"

export type ManualDeterminationDialogProps = DeterminationFieldsProps & {
  isOpen: boolean
  person: string
  /** Replacing an earlier determination. */
  isChange?: boolean
  /** The save failed: what happens now, already worded; the determination is unchanged. */
  saveError?: string
  onOpenChange?: (isOpen: boolean) => void
  /** With it the dialog checks and sends what was entered. */
  onSubmit?: (determination: { value: string; reason: string }) => void
  isSaving?: boolean
}

/** The server's limit of the reason. */
const REASON_MAX_LENGTH = 500

export function checkEntry(value: string, reason: string) {
  const trimmed = reason.trim()
  return {
    valueError: value ? undefined : "Vyberte hodnotu.",
    reasonError: !trimmed
      ? "Uveďte důvod."
      : trimmed.length > REASON_MAX_LENGTH
        ? `Důvod může mít nejvýše ${REASON_MAX_LENGTH} znaků.`
        : undefined,
  }
}

// Správa akce → Přihlášky → Vyhodnocení or detail přihlášky → Určit ubytování
// (F13-1, F14-1; spec v4 §4): the effective value of a person whose answer
// determines no room. It holds for every term of the registration until the
// answer changes. Design only: every value is passed in.
export function ManualDeterminationDialog({
  isOpen,
  person,
  isChange = false,
  saveError,
  onOpenChange,
  onSubmit,
  isSaving = false,
  ...fields
}: ManualDeterminationDialogProps) {
  const [value, setValue] = useState(fields.value ?? "")
  const [reason, setReason] = useState(fields.reason ?? "")
  const [errors, setErrors] = useState<ReturnType<typeof checkEntry> | null>(null)
  const interactive = onSubmit
    ? {
        value,
        reason,
        onValueChange: setValue,
        onReasonChange: setReason,
        isDisabled: isSaving,
        valueError: errors?.valueError,
        reasonError: errors?.reasonError,
      }
    : {}

  const submit = () => {
    const checked = checkEntry(value, reason)
    setErrors(checked)
    if (!checked.valueError && !checked.reasonError) onSubmit?.({ value, reason: reason.trim() })
  }

  return (
    <Dialog
      open={isOpen}
      // A save in progress finishes before the dialog can close.
      onOpenChange={(isOpening) => (isSaving ? undefined : onOpenChange?.(isOpening))}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isChange ? "Změnit určení ubytování" : "Určit ubytování"}</DialogTitle>
          <DialogDescription>{person} · všechny termíny přihlášky</DialogDescription>
        </DialogHeader>

        <DeterminationFields
          {...fields}
          {...interactive}
        />

        {saveError ? (
          <ErrorAlert
            title="Určení se nepodařilo uložit"
            detail={saveError}
          />
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={isSaving}
            >
              Zrušit
            </Button>
          </DialogClose>
          <Button
            disabled={isSaving}
            onClick={submit}
          >
            {isSaving ? <Loader2 className="animate-spin" /> : null}
            Uložit určení
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
