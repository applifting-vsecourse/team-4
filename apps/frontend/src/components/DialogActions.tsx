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
}

// The footer of a dialog that confirms one action: „Zrušit“ closes it, the
// confirming button spins while the action runs.
export function DialogActions({
  submitLabel,
  isPending,
  onSubmit,
  submitVariant = "default",
}: DialogActionsProps) {
  return (
    <DialogFooter>
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
