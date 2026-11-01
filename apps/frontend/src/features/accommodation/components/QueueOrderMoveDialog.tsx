import { Loader2 } from "lucide-react"

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

export type QueueOrderMoveDialogProps = {
  isOpen: boolean
  /** E.g. "Matěj Černý". */
  personName: string
  /** E.g. "1. turnus · Fronta Žena". */
  queueLabel: string
  /** The other waiting people the person can be moved next to. */
  targets: QueueMoveTarget[]
  placement?: "before" | "after"
  targetId?: string
  reason?: string
  /** Error at the target field, e.g. nothing chosen. */
  targetError?: string
  /** Error at the reason field, e.g. empty. */
  reasonError?: string
  isChecking?: boolean
  onOpenChange?: (isOpen: boolean) => void
  onSubmit?: () => void
}

// Přesun osoby ve frontě, krok 1: kam a proč (F39-1). Dalším krokem je
// potvrzení s původním a navrženým pořadím. Entered values stay after errors.
export function QueueOrderMoveDialog({
  isOpen,
  personName,
  queueLabel,
  targets,
  placement = "before",
  targetId,
  reason = "",
  targetError,
  reasonError,
  isChecking = false,
  onOpenChange,
  onSubmit,
}: QueueOrderMoveDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přesunout osobu {personName}</DialogTitle>
          <DialogDescription>{queueLabel}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit?.()
          }}
        >
          <RadioGroup
            defaultValue={placement}
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
            <Select defaultValue={targetId}>
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
              defaultValue={reason}
              aria-invalid={reasonError ? true : undefined}
            />
            {reasonError ? <FieldError>{reasonError}</FieldError> : null}
          </Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
              >
                Zrušit
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isChecking}
            >
              {isChecking ? <Loader2 className="animate-spin" /> : null}
              Pokračovat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
