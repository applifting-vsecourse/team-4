import type { ReactNode } from "react"

import { DialogActions } from "@/components/DialogActions"
import { FormError } from "@/components/FormError"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type ConfirmDeleteDialogProps = {
  isOpen: boolean
  onOpenChange?: (isOpen: boolean) => void
  /** E.g. Odstranit termín „Turnus 1“? */
  title: string
  /** What the deletion does beyond removing the record. */
  consequence: string
  /** The deletion failed; the record stays. */
  errorMessage?: string | null
  isDeleting?: boolean
  onConfirm?: () => unknown
  /** The button that opens the dialog, when the dialog owns its trigger. */
  trigger?: ReactNode
}

// Confirmation of every destructive deletion: one verb, the consequence, the
// failure at the dialog and a destructive button.
export function ConfirmDeleteDialog({
  isOpen,
  onOpenChange,
  title,
  consequence,
  errorMessage,
  isDeleting = false,
  onConfirm,
  trigger,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{consequence}</DialogDescription>
        </DialogHeader>
        {errorMessage ? <FormError message={errorMessage} /> : null}
        <DialogActions
          submitLabel="Odstranit"
          submitVariant="destructive"
          isPending={isDeleting}
          onSubmit={() => onConfirm?.()}
        />
      </DialogContent>
    </Dialog>
  )
}
