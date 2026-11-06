import { useState, type FormEvent } from "react"
import { ChevronDown, Info, Loader2 } from "lucide-react"

import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
import { Input } from "@/components/ui/input"

export type ChangeApprovalSettingsProps = {
  /**
   * The saved setting in words, e.g. "Schvalujete změny přihlášek od 14 dnů před začátkem termínu",
   * or "Žádné změny přihlášek nepodléhají vašemu schválení" when nothing is set.
   */
  savedSetting: string
  /** The entered number of days; empty by default, which means no approval is required. */
  days?: string
  daysError?: string
  errorMessage?: string
  isSaving?: boolean
  /** Called with the entered text; the owner validates it. Absent in the design preview. */
  onSubmit?: (days: string) => void
  onDismissError?: () => void
}

// Správa akce → Nastavení → Přihlašování (F35-1a): the number of days before
// each term's start from which the organizer approves registration changes.
// Placed in the existing Přihlašování card. The entered text stays in the field
// after a failed save; validation and saving belong to the owner.
export function ChangeApprovalSettings({
  savedSetting,
  days = "",
  daysError,
  errorMessage,
  isSaving = false,
  onSubmit,
  onDismissError,
}: ChangeApprovalSettingsProps) {
  const [value, setValue] = useState(days)
  const [isOpen, setIsOpen] = useState(true)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.(value)
  }

  return (
    <Collapsible
      asChild
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <section
        aria-labelledby="change-approval-heading"
        className="space-y-4"
      >
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-between text-left whitespace-normal"
          >
            <span>
              <h3
                id="change-approval-heading"
                className="text-base font-semibold"
              >
                Schvalování změn přihlášek
              </h3>
              <span className="block text-sm font-normal text-muted-foreground">
                Od kolika dní před začátkem termínu schvalujete změny přihlášek.
              </span>
            </span>
            <ChevronDown
              aria-hidden
              className={isOpen ? "rotate-180" : undefined}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4">
            <Alert>
              <Info />
              <AlertTitle>{savedSetting}</AlertTitle>
            </Alert>

            <form
              noValidate
              className="space-y-4"
              onSubmit={handleSubmit}
            >
              <Field
                className="sm:max-w-sm"
                data-invalid={daysError ? true : undefined}
              >
                <FieldLabel htmlFor="change-approval-days">
                  Počet dní před začátkem termínu
                </FieldLabel>
                <Input
                  id="change-approval-days"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="např. 14 dní"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  aria-invalid={daysError ? true : undefined}
                />
                {daysError ? <FieldError>{daysError}</FieldError> : null}
              </Field>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Uložit schvalování změn
                </Button>
              </div>
            </form>
          </div>
        </CollapsibleContent>

        <Dialog
          open={Boolean(errorMessage)}
          onOpenChange={(isOpen) => {
            if (!isOpen) onDismissError?.()
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Uložení se nezdařilo</DialogTitle>
              <DialogDescription>{errorMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                >
                  Zavřít
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </Collapsible>
  )
}
