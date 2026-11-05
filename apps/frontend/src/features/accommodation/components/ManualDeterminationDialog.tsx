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
  ...fields
}: ManualDeterminationDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isChange ? "Změnit určení ubytování" : "Určit ubytování"}</DialogTitle>
          <DialogDescription>{person} · všechny termíny přihlášky</DialogDescription>
        </DialogHeader>

        <DeterminationFields {...fields} />

        {saveError ? (
          <ErrorAlert
            title="Určení se nepodařilo uložit"
            detail={saveError}
          />
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Zrušit</Button>
          </DialogClose>
          <Button>Uložit určení</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
