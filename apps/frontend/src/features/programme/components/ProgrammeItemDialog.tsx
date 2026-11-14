import { useState, type FormEvent } from "react"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { type ProgrammeItemInput } from "@/features/programme/api/programmeSchemas"
import {
  readProgrammeForm,
  type ProgrammeItemErrors,
  type ProgrammeItemValues,
} from "@/features/programme/lib/programmeInput"

export type ProgrammeItemDialogProps = {
  isOpen: boolean
  /** The item being edited; a new item otherwise. */
  isEdit?: boolean
  /** Term the item belongs to, e.g. "Turnus 2 (20. 11. – 22. 11. 2026)". */
  termLabel: string
  /** Dates of the term; the item's day must lie within them. */
  termRange?: { startDate: string; endDate: string }
  values: ProgrammeItemValues
  /** Refused by the server, shown at the field next to the entered values. */
  errors?: ProgrammeItemErrors
  /** The save failed; the entered values stay in the form. */
  errorMessage?: string
  isSubmitting?: boolean
  onOpenChange?: (isOpen: boolean) => void
  /** Called with valid values only. */
  onSubmit?: (input: ProgrammeItemInput) => void
}

// Add or edit one programme item of a term (F65), organizer. The form is
// mounted only while the dialog is open, so closing discards the changes;
// after a refused save the entered values stay for a correction or retry.
export function ProgrammeItemDialog({
  isOpen,
  isEdit = false,
  termLabel,
  termRange,
  values,
  errors,
  errorMessage,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: ProgrammeItemDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upravit položku programu" : "Nová položka programu"}</DialogTitle>
          <DialogDescription>{termLabel}</DialogDescription>
        </DialogHeader>
        <ProgrammeItemForm
          initialValues={values}
          termRange={termRange}
          serverErrors={errors}
          errorMessage={errorMessage}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}

type ProgrammeItemFormProps = {
  initialValues: ProgrammeItemValues
  termRange?: { startDate: string; endDate: string }
  serverErrors?: ProgrammeItemErrors
  errorMessage?: string
  isSubmitting: boolean
  onSubmit?: (input: ProgrammeItemInput) => void
}

function ProgrammeItemForm({
  initialValues,
  termRange,
  serverErrors,
  errorMessage,
  isSubmitting,
  onSubmit,
}: ProgrammeItemFormProps) {
  const [values, setValues] = useState(initialValues)
  const [validationErrors, setValidationErrors] = useState<ProgrammeItemErrors>({})
  // A server refusal belongs to the date it was given for.
  const [refusedDate, setRefusedDate] = useState(initialValues.date)
  const errors: ProgrammeItemErrors = {
    ...(values.date === refusedDate ? serverErrors : undefined),
    ...validationErrors,
  }

  const change = (patch: Partial<ProgrammeItemValues>) => {
    setValues((current) => ({ ...current, ...patch }))
    setValidationErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch)) delete next[key as keyof ProgrammeItemValues]
      return next
    })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const result = readProgrammeForm(values, termRange ?? WHOLE_CALENDAR)
    if ("errors" in result) {
      setValidationErrors(result.errors)
      return
    }
    setValidationErrors({})
    setRefusedDate(values.date)
    onSubmit?.(result.input)
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={submit}
    >
      {errorMessage ? <FormError message={errorMessage} /> : null}
      <FieldGroup>
        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel htmlFor="programme-title">Název</FieldLabel>
          <Input
            id="programme-title"
            value={values.title}
            aria-invalid={errors.title ? true : undefined}
            onChange={(event) => change({ title: event.target.value })}
          />
          <FieldError>{errors.title}</FieldError>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errors.date ? true : undefined}>
            <FieldLabel htmlFor="programme-date">Datum</FieldLabel>
            <DatePicker
              id="programme-date"
              value={values.date}
              onChange={(date) => change({ date })}
              aria-invalid={errors.date ? true : undefined}
            />
            <FieldError>{errors.date}</FieldError>
          </Field>
          <Field data-invalid={errors.time ? true : undefined}>
            <FieldLabel htmlFor="programme-time">Začátek (čas Europe/Prague)</FieldLabel>
            <Input
              id="programme-time"
              type="time"
              value={values.time}
              aria-invalid={errors.time ? true : undefined}
              onChange={(event) => change({ time: event.target.value })}
            />
            <FieldError>{errors.time}</FieldError>
          </Field>
        </div>
        <Field data-invalid={errors.place ? true : undefined}>
          <FieldLabel htmlFor="programme-place">Místo (nepovinné)</FieldLabel>
          <Input
            id="programme-place"
            value={values.place}
            aria-invalid={errors.place ? true : undefined}
            onChange={(event) => change({ place: event.target.value })}
          />
          <FieldError>{errors.place}</FieldError>
        </Field>
        <Field data-invalid={errors.description ? true : undefined}>
          <FieldLabel htmlFor="programme-description">Krátký popis (nepovinné)</FieldLabel>
          <Textarea
            id="programme-description"
            value={values.description}
            aria-invalid={errors.description ? true : undefined}
            onChange={(event) => change({ description: event.target.value })}
          />
          <FieldError>{errors.description}</FieldError>
        </Field>
      </FieldGroup>
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
          isPending={isSubmitting}
        >
          Uložit položku
        </PendingButton>
      </DialogFooter>
    </form>
  )
}

// Without a term range (a preview) any real date passes the client check.
const WHOLE_CALENDAR = { startDate: "0000-01-01", endDate: "9999-12-31" }
