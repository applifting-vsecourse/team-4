import { RefreshCw } from "lucide-react"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
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

/**
 * review: before the one explicit confirmation.
 * saving: the confirmation is being written; it cannot be sent twice.
 * stale: the re-check at execution failed; nothing was confirmed.
 * failed: the write failed; states and payments are unchanged.
 */
export type BulkConfirmationState = "review" | "saving" | "stale" | "failed"

export type BulkConfirmationDialogProps = {
  isOpen: boolean
  state: BulkConfirmationState
  /** Already formatted, e.g. "1. turnus, 4.–11. 7. 2027". */
  term: string
  /** The people the confirmation confirms in the term, by position. */
  people: string[]
  /** Who of the proposal stays as they are, already worded, e.g. "3 neubytovatelní, 2 ruční určení". */
  remaining?: string
  /** Why the proposal is no longer valid, worded from the error code (state stale). */
  staleReason?: string
  onOpenChange?: (isOpen: boolean) => void
  /** The one explicit confirmation. */
  onConfirm?: () => void
  /** Loads the current proposal (state stale). */
  onReload?: () => void
}

function participations(count: number) {
  if (count === 1) return "1 účast"
  if (count >= 2 && count <= 4) return `${count} účasti`
  return `${count} účastí`
}

// Správa akce → Přihlášky → Vyhodnocení → Potvrdit všechny vhodné (F14-1):
// the one explicit confirmation of the term's proposal, with the people it
// confirms. Every value is passed in; the handlers belong to the caller.
export function BulkConfirmationDialog({
  isOpen,
  state,
  term,
  people,
  remaining,
  staleReason,
  onOpenChange,
  onConfirm,
  onReload,
}: BulkConfirmationDialogProps) {
  const isSaving = state === "saving"
  const isStale = state === "stale"
  const count = people.length

  return (
    <Dialog
      open={isOpen}
      // A confirmation in progress finishes before the dialog can close.
      onOpenChange={(isOpening) => (isSaving ? undefined : onOpenChange?.(isOpening))}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Potvrdit všechny vhodné</DialogTitle>
          <DialogDescription>{term}</DialogDescription>
        </DialogHeader>

        {isStale ? null : (
          <div className="space-y-3 text-sm">
            <ol className="list-decimal space-y-1 pl-6">
              {people.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ol>
            {remaining ? <p className="text-muted-foreground">Beze změny: {remaining}</p> : null}
          </div>
        )}

        {isStale ? (
          <FormError
            title="Návrh je neaktuální, nikdo nebyl potvrzen"
            message={staleReason}
          />
        ) : null}

        {state === "failed" ? (
          <FormError
            title="Potvrzení se nepodařilo uložit"
            message="Stavy účastí ani platby se nezměnily."
          />
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={isSaving}
            >
              {isStale ? "Zavřít" : "Zrušit"}
            </Button>
          </DialogClose>
          {isStale ? (
            <Button onClick={onReload}>
              <RefreshCw />
              Načíst nový návrh
            </Button>
          ) : (
            <PendingButton
              isPending={isSaving}
              onClick={onConfirm}
            >
              {isSaving ? "Potvrzuji…" : `Potvrdit ${participations(count)}`}
            </PendingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
