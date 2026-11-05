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
// one person's decision in one term. Design only: every value is passed in.
export function TermDecisionDialog({
  isOpen,
  decision,
  person,
  term,
  rejectedReason,
  determination,
}: TermDecisionDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TITLE[decision]}</DialogTitle>
          <DialogDescription>
            {person} · {term}
          </DialogDescription>
        </DialogHeader>

        {determination && !rejectedReason ? <DeterminationFields {...determination} /> : null}

        {rejectedReason ? (
          <ErrorAlert
            title={REJECTED[decision]}
            detail={rejectedReason}
          />
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{rejectedReason ? "Zavřít" : "Zrušit"}</Button>
          </DialogClose>
          {rejectedReason ? null : <Button>{TITLE[decision]}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
