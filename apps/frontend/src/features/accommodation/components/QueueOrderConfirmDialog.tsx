import { Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

export type QueueOrderConfirmDialogProps = {
  isOpen: boolean
  personName: string
  /** E.g. "před Annu Procházkovou". */
  placementText: string
  queueLabel: string
  /** Names in the order before the move. */
  originalOrder: string[]
  /** Names in the order after the move; includes the moved person. */
  proposedOrder: string[]
  reason: string
  /** The save failed; nothing was changed. */
  errorMessage?: string
  /** The queue changed meanwhile; the move is not saved over the newer state. */
  staleMessage?: string
  isSaving?: boolean
  onOpenChange?: (isOpen: boolean) => void
  onConfirm?: () => void
  onReload?: () => void
}

function OrderList({
  title,
  names,
  movedName,
}: {
  title: string
  names: string[]
  movedName: string
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <ol className="space-y-1 text-sm">
        {names.map((name, index) => (
          <li
            key={name}
            className="flex items-center gap-2"
          >
            <span className="w-6 font-mono">{index + 1}.</span>
            <span className={name === movedName ? "font-medium" : undefined}>{name}</span>
            {name === movedName ? <Badge variant="outline">Přesouvaná</Badge> : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

// Přesun osoby ve frontě, krok 2: potvrzení původního a navrženého pořadí a
// důvodu (F39-1). Saving writes the new order and the history record together.
export function QueueOrderConfirmDialog({
  isOpen,
  personName,
  placementText,
  queueLabel,
  originalOrder,
  proposedOrder,
  reason,
  errorMessage,
  staleMessage,
  isSaving = false,
  onOpenChange,
  onConfirm,
  onReload,
}: QueueOrderConfirmDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Potvrdit přesun</DialogTitle>
          <DialogDescription>
            {queueLabel}: {personName} {placementText}
          </DialogDescription>
        </DialogHeader>

        {staleMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Pořadí se mezitím změnilo</AlertTitle>
            <AlertDescription>{staleMessage}</AlertDescription>
          </Alert>
        ) : null}
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Přesun se nepodařilo uložit</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2">
          <OrderList
            title="Původní pořadí"
            names={originalOrder}
            movedName={personName}
          />
          <OrderList
            title="Navržené pořadí"
            names={proposedOrder}
            movedName={personName}
          />
        </div>
        <section className="space-y-1">
          <h3 className="text-sm font-medium">Důvod</h3>
          <p className="text-sm">{reason}</p>
        </section>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{staleMessage ? "Zavřít" : "Zpět"}</Button>
          </DialogClose>
          {staleMessage ? (
            <Button onClick={onReload}>Načíst aktuální frontu</Button>
          ) : (
            <Button
              onClick={onConfirm}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin" /> : null}
              {errorMessage ? "Zkusit znovu" : "Potvrdit přesun"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
