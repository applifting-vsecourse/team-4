import { RefreshCw } from "lucide-react"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Badge } from "@/components/ui/badge"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export type QueueMoveTarget = { id: string; label: string }

/** A person of the queue as listed in the review, by position. */
export type QueueMoveEntry = { id: string; label: string }

/**
 * form: where to and why.
 * review: the original and the new order with the reason, before saving.
 * saving: the move is being written; it cannot be sent twice.
 * stale: the queue changed meanwhile; nothing was saved.
 * failed: the write failed; the order is unchanged.
 */
export type QueueMoveStep = "form" | "review" | "saving" | "stale" | "failed"

export type QueueMoveDialogProps = {
  isOpen: boolean
  step: QueueMoveStep
  personId: string
  personName: string
  /** E.g. "1. turnus · fronta Žena". */
  queueLabel: string
  /** The other unconfirmed people of the queue the person can be placed next to. */
  targets: QueueMoveTarget[]
  placement?: "before" | "after"
  targetId?: string
  reason?: string
  targetError?: string
  reasonError?: string
  originalOrder?: QueueMoveEntry[]
  newOrder?: QueueMoveEntry[]
  /** Why the write failed, already worded; the design's text without it. */
  failedDetail?: string
  onOpenChange?: (isOpen: boolean) => void
  /** With these the fields follow the values passed in. */
  onPlacementChange?: (placement: "before" | "after") => void
  onTargetChange?: (targetId: string) => void
  onReasonChange?: (reason: string) => void
  /** Form: checks the entry and shows the review. */
  onContinue?: () => void
  /** Review or failed: saves the move. */
  onSave?: () => void
  /** Stale: loads the current queue for a new confirmation. */
  onReload?: () => void
}

function OrderList({
  title,
  entries,
  movedId,
}: {
  title: string
  entries: QueueMoveEntry[]
  movedId: string
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ol className="list-decimal space-y-1 pl-6 text-sm">
        {entries.map((entry) => (
          <li key={entry.id}>
            <span className="inline-flex flex-wrap items-center gap-2">
              {entry.label}
              {entry.id === movedId ? <Badge variant="outline">Přesouvá se</Badge> : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Správa akce → Přihlášky → Vyhodnocení → fronta → Změnit pořadí (F39-1; spec
// v4 §6): place an unconfirmed person right before or after another one of
// the same queue, with a reason, then review the original and the new order.
// The move changes priority only; it confirms nobody. Every value is passed
// in; with the handlers the fields are controlled.
export function QueueMoveDialog({
  isOpen,
  step,
  personId,
  personName,
  queueLabel,
  targets,
  placement = "before",
  targetId,
  reason = "",
  targetError,
  reasonError,
  originalOrder = [],
  newOrder = [],
  failedDetail = "Pořadí zůstává původní.",
  onOpenChange,
  onPlacementChange,
  onTargetChange,
  onReasonChange,
  onContinue,
  onSave,
  onReload,
}: QueueMoveDialogProps) {
  const isForm = step === "form"
  const isSaving = step === "saving"

  return (
    <Dialog
      open={isOpen}
      // A save in progress finishes before the dialog can close.
      onOpenChange={(isOpening) => (isSaving ? undefined : onOpenChange?.(isOpening))}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Změnit pořadí: {personName}</DialogTitle>
          <DialogDescription>{queueLabel}</DialogDescription>
        </DialogHeader>

        {isForm ? (
          <div className="space-y-6">
            <RadioGroup
              {...(onPlacementChange
                ? {
                    value: placement,
                    onValueChange: (value: string) =>
                      onPlacementChange(value === "after" ? "after" : "before"),
                  }
                : { defaultValue: placement })}
              aria-label="Umístění"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  id="move-before"
                  value="before"
                />
                <Label htmlFor="move-before">Před osobu</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  id="move-after"
                  value="after"
                />
                <Label htmlFor="move-after">Za osobu</Label>
              </div>
            </RadioGroup>

            <Field data-invalid={targetError ? true : undefined}>
              <FieldLabel htmlFor="move-target">Osoba</FieldLabel>
              <Select
                {...(onTargetChange
                  ? { value: targetId ?? "", onValueChange: onTargetChange }
                  : { defaultValue: targetId })}
              >
                <SelectTrigger
                  id="move-target"
                  aria-invalid={targetError ? true : undefined}
                >
                  <SelectValue placeholder="Vyberte osobu" />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((target) => (
                    <SelectItem
                      key={target.id}
                      value={target.id}
                    >
                      {target.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetError ? <FieldError>{targetError}</FieldError> : null}
            </Field>

            <Field data-invalid={reasonError ? true : undefined}>
              <FieldLabel htmlFor="move-reason">Důvod</FieldLabel>
              <Textarea
                id="move-reason"
                {...(onReasonChange
                  ? { value: reason, onChange: (event) => onReasonChange(event.target.value) }
                  : { defaultValue: reason })}
                aria-invalid={reasonError ? true : undefined}
              />
              {reasonError ? <FieldError>{reasonError}</FieldError> : null}
            </Field>
          </div>
        ) : null}

        {step === "review" || isSaving || step === "failed" ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <OrderList
                title="Původní pořadí"
                entries={originalOrder}
                movedId={personId}
              />
              <OrderList
                title="Nové pořadí"
                entries={newOrder}
                movedId={personId}
              />
            </div>
            <dl className="text-sm">
              <dt className="text-muted-foreground">Důvod</dt>
              <dd className="break-words">{reason}</dd>
            </dl>
          </div>
        ) : null}

        {step === "stale" ? (
          <FormError
            title="Pořadí nebylo uloženo"
            message="Fronta se mezitím změnila. Načtěte ji znovu a přesun zopakujte."
          />
        ) : null}

        {step === "failed" ? (
          <FormError
            title="Změnu pořadí se nepodařilo uložit"
            message={failedDetail}
          />
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={isSaving}
            >
              {step === "stale" ? "Zavřít" : "Zrušit"}
            </Button>
          </DialogClose>
          {isForm ? <Button onClick={onContinue}>Pokračovat</Button> : null}
          {step === "review" || step === "failed" || isSaving ? (
            <PendingButton
              isPending={isSaving}
              onClick={onSave}
            >
              {isSaving ? "Ukládám…" : "Uložit pořadí"}
            </PendingButton>
          ) : null}
          {step === "stale" ? (
            <Button onClick={onReload}>
              <RefreshCw />
              Načíst aktuální frontu
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
