import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
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

export type ProgrammeItemValues = {
  title: string
  /** `yyyy-MM-dd`, or "" when nothing is chosen. */
  date: string
  /** `HH:mm`, or "". */
  time: string
  place: string
  description: string
}

export type ProgrammeItemErrors = {
  title?: string
  date?: string
  time?: string
}

export type ProgrammeItemDialogProps = {
  isOpen: boolean
  /** The item being edited; a new item otherwise. */
  isEdit?: boolean
  /** Term the item belongs to, e.g. "Turnus 2 (20. 11. – 22. 11. 2026)". */
  termLabel: string
  values: ProgrammeItemValues
  errors?: ProgrammeItemErrors
  /** The save failed; the entered values stay in the form. */
  errorMessage?: string
  isSubmitting?: boolean
}

// Add or edit one programme item of a term (F65), organizer. Design only:
// every value is passed in, nothing is saved.
export function ProgrammeItemDialog({
  isOpen,
  isEdit = false,
  termLabel,
  values,
  errors = {},
  errorMessage,
  isSubmitting = false,
}: ProgrammeItemDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upravit položku programu" : "Nová položka programu"}</DialogTitle>
          <DialogDescription>{termLabel}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
        >
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <Field data-invalid={errors.title ? true : undefined}>
              <FieldLabel htmlFor="programme-title">Název</FieldLabel>
              <Input
                id="programme-title"
                defaultValue={values.title}
                aria-invalid={errors.title ? true : undefined}
              />
              <FieldError>{errors.title}</FieldError>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={errors.date ? true : undefined}>
                <FieldLabel htmlFor="programme-date">Datum</FieldLabel>
                <DatePicker
                  id="programme-date"
                  value={values.date}
                  onChange={() => undefined}
                  aria-invalid={errors.date ? true : undefined}
                />
                <FieldError>{errors.date}</FieldError>
              </Field>
              <Field data-invalid={errors.time ? true : undefined}>
                <FieldLabel htmlFor="programme-time">Začátek (čas Europe/Prague)</FieldLabel>
                <Input
                  id="programme-time"
                  type="time"
                  defaultValue={values.time}
                  aria-invalid={errors.time ? true : undefined}
                />
                <FieldError>{errors.time}</FieldError>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="programme-place">Místo (nepovinné)</FieldLabel>
              <Input
                id="programme-place"
                defaultValue={values.place}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="programme-description">Krátký popis (nepovinné)</FieldLabel>
              <Textarea
                id="programme-description"
                defaultValue={values.description}
              />
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
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Uložit položku
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
