import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export type DeterminationFieldsProps = {
  /** The participant's own answer, e.g. "Nechci uvést"; it is never changed. */
  answer: string
  /** The determining values of the hard attribute, e.g. ["Žena", "Muž"]. */
  values: string[]
  value?: string
  reason?: string
  valueError?: string
  reasonError?: string
  /** With them the fields are controlled; without, they only show `value` and `reason`. */
  onValueChange?: (value: string) => void
  onReasonChange?: (reason: string) => void
  isDisabled?: boolean
}

// The organizer's determination of the effective value (spec v4 §4): which
// determining value the person counts as, and why. Entered values stay after
// errors. Design only: every value is passed in.
export function DeterminationFields({
  answer,
  values,
  value,
  reason = "",
  valueError,
  reasonError,
  onValueChange,
  onReasonChange,
  isDisabled = false,
}: DeterminationFieldsProps) {
  return (
    <div className="space-y-4">
      <dl className="text-sm">
        <dt className="text-muted-foreground">Odpověď účastníka</dt>
        <dd>{answer}</dd>
      </dl>

      <Field data-invalid={valueError ? true : undefined}>
        <FieldLabel htmlFor="determination-value">Ubytovat jako</FieldLabel>
        <Select
          {...(onValueChange ? { value: value ?? "", onValueChange } : { defaultValue: value })}
          disabled={isDisabled}
        >
          <SelectTrigger
            id="determination-value"
            aria-invalid={valueError ? true : undefined}
          >
            <SelectValue placeholder="Vyberte hodnotu" />
          </SelectTrigger>
          <SelectContent>
            {values.map((option) => (
              <SelectItem
                key={option}
                value={option}
              >
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {valueError ? <FieldError>{valueError}</FieldError> : null}
      </Field>

      <Field data-invalid={reasonError ? true : undefined}>
        <FieldLabel htmlFor="determination-reason">Důvod</FieldLabel>
        <Textarea
          id="determination-reason"
          {...(onReasonChange
            ? { value: reason, onChange: (event) => onReasonChange(event.target.value) }
            : { defaultValue: reason })}
          disabled={isDisabled}
          aria-invalid={reasonError ? true : undefined}
        />
        {reasonError ? <FieldError>{reasonError}</FieldError> : null}
      </Field>
    </div>
  )
}
