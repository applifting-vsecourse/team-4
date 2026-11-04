import { CircleAlert, Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"
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
  /** Participations the confirmation creates. */
  count: number
  /** Why the proposal is no longer valid, worded from the error code (state stale). */
  staleReason?: string
}

function participations(count: number) {
  if (count === 1) return "1 účast"
  if (count >= 2 && count <= 4) return `${count} účasti`
  return `${count} účastí`
}

// Správa akce → Přihlášky → Ke schválení → Potvrdit všechny vhodné (F14-1):
// the one explicit confirmation of the term's proposal. Design only: every
// value is passed in.
export function BulkConfirmationDialog({
  isOpen,
  state,
  term,
  count,
  staleReason,
}: BulkConfirmationDialogProps) {
  const isSaving = state === "saving"
  const isStale = state === "stale"

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Potvrdit všechny vhodné</DialogTitle>
          <DialogDescription>{term}</DialogDescription>
        </DialogHeader>

        {isStale ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>{staleReason}</AlertTitle>
          </Alert>
        ) : null}

        {state === "failed" ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Potvrzení se nepodařilo uložit.</AlertTitle>
          </Alert>
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
            <Button>
              <RefreshCw />
              Načíst nový návrh
            </Button>
          ) : (
            <Button disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin" /> : null}
              {isSaving ? "Potvrzuji…" : `Potvrdit ${participations(count)}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
