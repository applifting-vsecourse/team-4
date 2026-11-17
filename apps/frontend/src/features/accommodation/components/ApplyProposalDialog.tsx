import { Sparkles } from "lucide-react"

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

import type { ApplyChanges } from "@/features/accommodation/lib/roomProposalView"

/**
 * review: the changes before the one explicit step.
 * saving: the placements are being written; it cannot be sent twice.
 * stale: the term changed since the proposal; nothing was saved.
 * failed: the write failed; the saved placements are unchanged.
 */
export type ApplyProposalState = "review" | "saving" | "stale" | "failed"

export type ApplyProposalDialogProps = {
  isOpen: boolean
  state: ApplyProposalState
  /** Already formatted, e.g. "1. turnus, 4.–17. 7. 2027". */
  term: string
  changes: ApplyChanges
  onOpenChange?: (isOpen: boolean) => void
  /** The one explicit step; also the retry after a failure. */
  onApply?: () => void
  /** Starts a new proposal of the term (state stale). */
  onPropose?: () => void
}

function ChangeList({ title, items }: { title: string; items: { id: string; text: string }[] }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="font-medium">
        {title} ({items.length})
      </p>
      <ul className="list-disc space-y-1 pl-6">
        {items.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
    </div>
  )
}

// Správa akce → Ubytování → Návrh pokojů → Použít návrh (#390, phase-2 spec
// §7.2): what applying the proposal changes in the saved placements, then
// one explicit step. Only unlocked placements change; locks, participation
// and publication stay. Every value is passed in; the handlers belong to the
// caller.
export function ApplyProposalDialog({
  isOpen,
  state,
  term,
  changes,
  onOpenChange,
  onApply,
  onPropose,
}: ApplyProposalDialogProps) {
  const isSaving = state === "saving"
  const isStale = state === "stale"

  return (
    <Dialog
      open={isOpen}
      // Saving finishes before the dialog can close.
      onOpenChange={(isOpening) => (isSaving ? undefined : onOpenChange?.(isOpening))}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Použít návrh pokojů</DialogTitle>
          <DialogDescription>{term}</DialogDescription>
        </DialogHeader>

        {isStale ? (
          <FormError
            title="Návrh pokojů je neaktuální, nic se neuložilo"
            message="Podklady se od návrhu změnily. Vytvořte nový návrh a zkontrolujte ho."
          />
        ) : (
          <div className="space-y-4 text-sm">
            <ChangeList
              title="Nová umístění"
              items={changes.added.map((c) => ({ id: c.id, text: `${c.name}: ${c.room}` }))}
            />
            <ChangeList
              title="Přesuny"
              items={changes.moved.map((c) => ({
                id: c.id,
                text: `${c.name}: ${c.from} → ${c.to}`,
              }))}
            />
            <ChangeList
              title="Odebraná umístění"
              items={changes.removed.map((c) => ({ id: c.id, text: `${c.name}: ${c.from}` }))}
            />
            <p className="text-muted-foreground">
              Zamčená umístění, účast ani zveřejnění pokojů se nezmění.
            </p>
          </div>
        )}

        {state === "failed" ? (
          <FormError
            title="Návrh se nepodařilo použít"
            message="Uložené rozdělení zůstalo beze změny. Zkuste to znovu."
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
            <Button onClick={onPropose}>
              <Sparkles />
              Navrhnout pokoje
            </Button>
          ) : (
            <PendingButton
              isPending={isSaving}
              onClick={onApply}
            >
              {isSaving ? "Ukládám…" : "Použít návrh"}
            </PendingButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
