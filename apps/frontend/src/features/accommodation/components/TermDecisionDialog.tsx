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
import { checkEntry } from "@/features/accommodation/components/ManualDeterminationDialog"

export type TermDecision = "confirm" | "waitlist"

export type TermDecisionDialogProps = {
  isOpen: boolean
  decision: TermDecision
  person: string
  /** Already formatted, e.g. "2. turnus, 11.–18. 7. 2027". */
  term: string
  /** Why the decision was not saved (capacity, rules), worded from the error code. */
  rejectedReason?: string
  /**
   * Confirming a person without an effective value: the organizer determines
   * it in the same dialog (spec v4 §3). Waitlisting needs no value.
   */
  determination?: DeterminationFieldsProps
  /** The save failed without a verdict (network): nothing was saved and it can be repeated. */
  saveError?: string
  onOpenChange?: (isOpen: boolean) => void
  /** With it the dialog checks what was entered and sends it; without, it only shows. */
  onSubmit?: (determination?: { value: string; reason: string }) => void
  isSaving?: boolean
}

const TITLE: Record<TermDecision, string> = {
  confirm: "Potvrdit účast",
  waitlist: "Zařadit mezi náhradníky",
}

const REJECTED: Record<TermDecision, string> = {
  confirm: "Účast nebyla potvrzena",
  waitlist: "Zařazení mezi náhradníky nebylo uloženo",
}

// Správa akce → Přihlášky → detail přihlášky, or a row of Vyhodnocení (F14-1):
// one person's decision in one term. Every value is passed in; the decision
// is the caller's to send.
export function TermDecisionDialog({
  isOpen,
  decision,
  person,
  term,
  rejectedReason,
  determination,
  saveError,
  onOpenChange,
  onSubmit,
  isSaving = false,
}: TermDecisionDialogProps) {
  const [value, setValue] = useState(determination?.value ?? "")
  const [reason, setReason] = useState(determination?.reason ?? "")
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
    if (!determination) {
      onSubmit?.()
      return
    }
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
          <DialogTitle>{TITLE[decision]}</DialogTitle>
          <DialogDescription>
            {person} · {term}
          </DialogDescription>
        </DialogHeader>

        {determination && !rejectedReason ? (
          <DeterminationFields
            {...determination}
            {...interactive}
          />
        ) : null}

        {rejectedReason ? (
          <ErrorAlert
            title={REJECTED[decision]}
            detail={rejectedReason}
          />
        ) : null}

        {saveError && !rejectedReason ? (
          <ErrorAlert
            title="Rozhodnutí se nepodařilo uložit"
            detail={saveError}
          />
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={isSaving}
            >
              {rejectedReason ? "Zavřít" : "Zrušit"}
            </Button>
          </DialogClose>
          {rejectedReason ? null : (
            <Button
              disabled={isSaving}
              onClick={submit}
            >
              {isSaving ? <Loader2 className="animate-spin" /> : null}
              {TITLE[decision]}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
