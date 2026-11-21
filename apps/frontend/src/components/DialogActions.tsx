import type { ReactNode } from "react"

import { PendingButton } from "@/components/PendingButton"
import { Button } from "@/components/ui/button"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"

type DialogActionsProps = {
  submitLabel: ReactNode
  isPending: boolean
  /** Without it the confirming button submits the dialog's form. */
  onSubmit?: () => unknown
  submitVariant?: "default" | "destructive"
  /** A secondary action at the start of the footer, e.g. deleting the edited record. */
  leading?: ReactNode
}

// The footer of a dialog that confirms one action: „Zrušit“ closes it, the
// confirming button spins while the action runs.
export function DialogActions({
  submitLabel,
  isPending,
  onSubmit,
  submitVariant = "default",
  leading,
}: DialogActionsProps) {
  return (
    <DialogFooter>
      {leading ? <div className="flex sm:mr-auto">{leading}</div> : null}
      <DialogClose asChild>
        <Button
          type="button"
          variant="outline"
        >
          Zrušit
        </Button>
      </DialogClose>
      <PendingButton
        variant={submitVariant}
        isPending={isPending}
        {...(onSubmit ? { type: "button", onClick: () => onSubmit() } : { type: "submit" })}
      >
        {submitLabel}
      </PendingButton>
    </DialogFooter>
  )
}
