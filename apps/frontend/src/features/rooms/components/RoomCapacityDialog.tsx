import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import { CapacityConflictAlert } from "@/features/rooms/components/CapacityConflictAlert"

/** The settings of a room in one term, as entered. */
export type RoomTermSetting = {
  termId: string
  termLabel: string
  /** Already formatted, e.g. "4.–17. 7. 2027". */
  dates: string
  isAvailable: boolean
  beds: string
  extraBeds: string
  bedsError?: string
  extraBedsError?: string
}

type RoomCapacityDialogProps = {
  isOpen: boolean
  /** Without it the dialog adds a new room. */
  isEdit?: boolean
  label: string
  terms: RoomTermSetting[]
  /** Terms the change would drop below their confirmed participants. */
  conflictTerms?: string
  errorMessage?: string
  isSaving?: boolean
}

// Adding and editing a room (F11-1): availability, base beds and extra beds
// set separately for each term. Design only: values and errors are passed in;
// the availability switches are the only state.
export function RoomCapacityDialog({
  isOpen,
  isEdit = false,
  label,
  terms,
  conflictTerms,
  errorMessage,
  isSaving = false,
}: RoomCapacityDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Upravit pokoj ${label}` : "Nový pokoj"}</DialogTitle>
          <DialogDescription className="sr-only">
            Označení pokoje a jeho dostupnost, základní lůžka a přistýlky v jednotlivých termínech.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-6"
        >
          {conflictTerms ? <CapacityConflictAlert terms={conflictTerms} /> : null}
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <Field>
            <FieldLabel htmlFor="room-label">Označení</FieldLabel>
            <Input
              id="room-label"
              placeholder="např. Chatka 1"
              defaultValue={label}
            />
          </Field>

          {terms.map((term) => (
            <TermSettingFields
              key={term.termId}
              term={term}
            />
          ))}

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
              type="button"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Uložit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Switching a term off disables its bed fields; the entered values stay.
function TermSettingFields({ term }: { term: RoomTermSetting }) {
  const [isAvailable, setIsAvailable] = useState(term.isAvailable)

  return (
    <FieldSet>
      <FieldLegend variant="label">
        {term.termLabel}
        <span className="ml-2 font-normal text-muted-foreground">{term.dates}</span>
      </FieldLegend>
      <FieldGroup>
        <Field orientation="horizontal">
          <Switch
            id={`${term.termId}-available`}
            checked={isAvailable}
            onCheckedChange={setIsAvailable}
          />
          <FieldLabel htmlFor={`${term.termId}-available`}>Dostupný v termínu</FieldLabel>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field
            data-disabled={isAvailable ? undefined : true}
            data-invalid={term.bedsError ? true : undefined}
          >
            <FieldLabel htmlFor={`${term.termId}-beds`}>Základní lůžka</FieldLabel>
            <Input
              id={`${term.termId}-beds`}
              inputMode="numeric"
              defaultValue={term.beds}
              disabled={!isAvailable}
              aria-invalid={term.bedsError ? true : undefined}
            />
            {term.bedsError ? <FieldError>{term.bedsError}</FieldError> : null}
          </Field>
          <Field
            data-disabled={isAvailable ? undefined : true}
            data-invalid={term.extraBedsError ? true : undefined}
          >
            <FieldLabel htmlFor={`${term.termId}-extra-beds`}>Přistýlky</FieldLabel>
            <Input
              id={`${term.termId}-extra-beds`}
              inputMode="numeric"
              defaultValue={term.extraBeds}
              disabled={!isAvailable}
              aria-invalid={term.extraBedsError ? true : undefined}
            />
            {term.extraBedsError ? <FieldError>{term.extraBedsError}</FieldError> : null}
          </Field>
        </div>
      </FieldGroup>
    </FieldSet>
  )
}
