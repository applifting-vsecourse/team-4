import { useState, type FormEvent } from "react"

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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import { type RoomInput } from "@/features/rooms/api/roomSchemas"
import {
  CapacityConflictAlert,
  type CapacityConflict,
} from "@/features/rooms/components/CapacityConflictAlert"
import { readRoomForm } from "@/features/rooms/lib/roomSettings"

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
  /** Base beds were typed for this term itself, so the default no longer fills them. */
  isBedsCustom?: boolean
}

type RoomCapacityDialogProps = {
  isOpen: boolean
  /** Without it the dialog adds a new room. */
  isEdit?: boolean
  label: string
  terms: RoomTermSetting[]
  /** Terms the change would drop below their confirmed participants. */
  conflicts?: CapacityConflict[]
  errorMessage?: string
  /** Refused by the server, e.g. a label already used in the event. */
  labelError?: string
  isSaving?: boolean
  onOpenChange?: (isOpen: boolean) => void
  /** Called with valid values only. */
  onSubmit?: (input: RoomInput) => void
}

// Adding and editing a room (F11-1): availability, base beds and extra beds
// set separately for each term. The form is mounted only while the dialog is
// open, so closing discards the changes; after a refused save the entered
// values stay for a correction or retry.
export function RoomCapacityDialog({
  isOpen,
  isEdit = false,
  label,
  terms,
  conflicts,
  errorMessage,
  labelError,
  isSaving = false,
  onOpenChange,
  onSubmit,
}: RoomCapacityDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Upravit pokoj ${label}` : "Nový pokoj"}</DialogTitle>
          <DialogDescription className="sr-only">
            Označení pokoje a jeho dostupnost, základní lůžka a přistýlky v jednotlivých termínech.
          </DialogDescription>
        </DialogHeader>
        <RoomCapacityForm
          isEdit={isEdit}
          initialLabel={label}
          initialTerms={terms}
          conflicts={conflicts}
          errorMessage={errorMessage}
          serverLabelError={labelError}
          isSaving={isSaving}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}

type RoomCapacityFormProps = {
  isEdit: boolean
  initialLabel: string
  initialTerms: RoomTermSetting[]
  conflicts?: CapacityConflict[]
  errorMessage?: string
  serverLabelError?: string
  isSaving: boolean
  onSubmit?: (input: RoomInput) => void
}

function RoomCapacityForm({
  isEdit,
  initialLabel,
  initialTerms,
  conflicts,
  errorMessage,
  serverLabelError,
  isSaving,
  onSubmit,
}: RoomCapacityFormProps) {
  const [label, setLabel] = useState(initialLabel)
  const [terms, setTerms] = useState(initialTerms)
  const [defaultBeds, setDefaultBeds] = useState("")
  // The default is offered when adding a room to more than one term.
  const hasDefault = !isEdit && initialTerms.length > 1
  const [validationLabelError, setValidationLabelError] = useState<string>()
  // A server refusal belongs to the label it was given for.
  const [refusedLabel, setRefusedLabel] = useState(initialLabel)
  const labelError =
    validationLabelError ?? (label.trim() === refusedLabel.trim() ? serverLabelError : undefined)

  const change = (termId: string, patch: Partial<RoomTermSetting>) =>
    setTerms((current) =>
      current.map((term) => (term.termId === termId ? { ...term, ...patch } : term)),
    )

  // The default fills every term whose base beds were not typed separately.
  const changeDefault = (value: string) => {
    setDefaultBeds(value)
    setTerms((current) =>
      current.map((term) =>
        term.isBedsCustom ? term : { ...term, beds: value, bedsError: undefined },
      ),
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = readRoomForm(label, terms)
    if ("input" in result) {
      setValidationLabelError(undefined)
      setRefusedLabel(label.trim())
      onSubmit?.(result.input)
      return
    }
    setValidationLabelError(result.labelError)
    setTerms(result.terms)
  }

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={submit}
    >
      {conflicts?.length ? <CapacityConflictAlert conflicts={conflicts} /> : null}
      {errorMessage ? <FormError message={errorMessage} /> : null}

      <Field data-invalid={labelError ? true : undefined}>
        <FieldLabel htmlFor="room-label">Označení</FieldLabel>
        <Input
          id="room-label"
          placeholder="např. Chatka 1"
          value={label}
          aria-invalid={labelError ? true : undefined}
          onChange={(event) => {
            setLabel(event.target.value)
            setValidationLabelError(undefined)
          }}
        />
        {labelError ? <FieldError>{labelError}</FieldError> : null}
      </Field>

      {hasDefault ? (
        <Field>
          <FieldLabel htmlFor="room-default-beds">Výchozí základní lůžka</FieldLabel>
          <Input
            id="room-default-beds"
            inputMode="numeric"
            value={defaultBeds}
            placeholder="0"
            onFocus={(event) => event.target.select()}
            onChange={(event) => changeDefault(event.target.value)}
          />
          <FieldDescription>
            Předvyplní se ve všech termínech, upravit ji můžete jen u termínu, který se liší.
          </FieldDescription>
        </Field>
      ) : null}

      {terms.map((term) => (
        <TermSettingFields
          key={term.termId}
          term={term}
          onChange={(patch) => change(term.termId, patch)}
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
        <PendingButton
          type="submit"
          isPending={isSaving}
        >
          Uložit
        </PendingButton>
      </DialogFooter>
    </form>
  )
}

// Switching a term off disables its bed fields; the entered values stay.
function TermSettingFields({
  term,
  onChange,
}: {
  term: RoomTermSetting
  onChange: (patch: Partial<RoomTermSetting>) => void
}) {
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
            checked={term.isAvailable}
            onCheckedChange={(isAvailable) => onChange({ isAvailable })}
          />
          <FieldLabel htmlFor={`${term.termId}-available`}>Dostupný v termínu</FieldLabel>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field
            data-disabled={term.isAvailable ? undefined : true}
            data-invalid={term.bedsError ? true : undefined}
          >
            <FieldLabel htmlFor={`${term.termId}-beds`}>Základní lůžka</FieldLabel>
            <Input
              id={`${term.termId}-beds`}
              inputMode="numeric"
              value={term.beds}
              placeholder="0"
              disabled={!term.isAvailable}
              onFocus={(event) => event.target.select()}
              aria-invalid={term.bedsError ? true : undefined}
              onChange={(event) =>
                onChange({
                  beds: event.target.value,
                  bedsError: undefined,
                  isBedsCustom: event.target.value.trim() !== "",
                })
              }
            />
            {term.bedsError ? <FieldError>{term.bedsError}</FieldError> : null}
          </Field>
          <Field
            data-disabled={term.isAvailable ? undefined : true}
            data-invalid={term.extraBedsError ? true : undefined}
          >
            <FieldLabel htmlFor={`${term.termId}-extra-beds`}>Přistýlky</FieldLabel>
            <Input
              id={`${term.termId}-extra-beds`}
              inputMode="numeric"
              value={term.extraBeds}
              placeholder="0"
              disabled={!term.isAvailable}
              onFocus={(event) => event.target.select()}
              aria-invalid={term.extraBedsError ? true : undefined}
              onChange={(event) =>
                onChange({ extraBeds: event.target.value, extraBedsError: undefined })
              }
            />
            {term.extraBedsError ? <FieldError>{term.extraBedsError}</FieldError> : null}
          </Field>
        </div>
      </FieldGroup>
    </FieldSet>
  )
}
