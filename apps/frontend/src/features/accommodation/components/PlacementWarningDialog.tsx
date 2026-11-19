import { useId, useState } from "react"

import { DialogActions } from "@/components/DialogActions"
import { FormError } from "@/components/FormError"
import { Notice } from "@/components/Notice"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"

import {
  offersLock,
  warningText,
  type PlacementWarning,
} from "@/features/accommodation/lib/placements"

export type PlacementWarningDialogProps = {
  person: string
  room: string
  warnings: PlacementWarning[]
  isSaving: boolean
  /** The save failed, already worded; the dialog stays open. */
  saveError?: string
  /** `shouldLock` is true when the organizer locked the exception. */
  onConfirm: (shouldLock: boolean) => unknown
  onCancel: () => unknown
}

// Správa akce → Ubytování → Rozdělení do pokojů (F14-2): a placement that
// breaks the hard attribute, the capacity or uses an extra bed is saved only
// after the organizer confirms it. A mixed room offers to lock the exception,
// so a room proposal does not move it.
export function PlacementWarningDialog({
  person,
  room,
  warnings,
  isSaving,
  saveError,
  onConfirm,
  onCancel,
}: PlacementWarningDialogProps) {
  const [shouldLock, setShouldLock] = useState(false)
  const lockId = useId()

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSaving) onCancel()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Umístit do pokoje {room}</DialogTitle>
          <DialogDescription>{person}</DialogDescription>
        </DialogHeader>
        <Notice
          tone="warning"
          title="Umístění porušuje pravidla pokojů"
        >
          <ul className="list-disc space-y-1 pl-4">
            {warnings.map((warning) => (
              <li key={warning.kind}>{warningText(warning)}</li>
            ))}
          </ul>
        </Notice>
        {offersLock(warnings) ? (
          <Field orientation="horizontal">
            <Checkbox
              id={lockId}
              checked={shouldLock}
              onCheckedChange={(checked) => setShouldLock(checked === true)}
            />
            <FieldLabel htmlFor={lockId}>Zamknout umístění</FieldLabel>
          </Field>
        ) : null}
        {saveError ? (
          <FormError
            title="Umístění se nepodařilo uložit"
            message={saveError}
          />
        ) : null}
        <DialogActions
          submitLabel="Umístit i přesto"
          isPending={isSaving}
          onSubmit={() => onConfirm(shouldLock)}
        />
      </DialogContent>
    </Dialog>
  )
}
