import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { genderSchema, type GenderAnswer } from "@/features/registrations/api/registrationSchemas"
import {
  GENDER_LABELS,
  GENDER_OTHER_MAX_LENGTH,
  GENDERS,
  NO_GENDER_ANSWER,
} from "@/features/registrations/lib/gender"

type GenderFieldProps = {
  /** Prefix of the option ids; unique on the page. */
  id: string
  /** A null gender is "not answered": no option selected. */
  value: GenderAnswer
  onChange: (value: GenderAnswer) => void
  isDisabled?: boolean
  /**
   * Rooms are split by gender, so an answer is needed; "Nechci uvést" counts
   * as one (PO feedback on #485).
   */
  isRequired?: boolean
  /** E.g. a required answer still missing. */
  error?: string
}

// F64: the voluntary answer for accommodation, one option at most. "Jiná
// odpověď" opens a field for the participant's own words; another option drops
// them. "Zrušit výběr" returns to no answer, which differs from "Nechci uvést".
export function GenderField({
  id,
  value,
  onChange,
  isDisabled,
  isRequired = false,
  error,
}: GenderFieldProps) {
  const otherId = `${id}-other-words`
  const descriptionId = `${id}-description`
  const errorId = `${id}-error`
  return (
    <div className="rounded-lg border border-border bg-background p-4 sm:p-5">
      <FieldSet data-invalid={error ? true : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FieldLegend>
            Pohlaví pro ubytování
            {isRequired ? (
              <span
                aria-hidden="true"
                className="text-destructive"
              >
                {" "}
                *
              </span>
            ) : null}
          </FieldLegend>
          {/* A required answer is changed, never cleared. */}
          {value.gender && !isRequired ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isDisabled}
              onClick={() => onChange(NO_GENDER_ANSWER)}
            >
              Zrušit výběr
            </Button>
          ) : null}
        </div>
        {isRequired ? (
          <FieldDescription id={descriptionId}>
            Pokoje se dělí podle pohlaví. Pokud ho nechcete uvádět, zvolte „Nechci uvést“.
          </FieldDescription>
        ) : null}
        <RadioGroup
          value={value.gender ?? ""}
          onValueChange={(next) => {
            const gender = genderSchema.parse(next)
            onChange({ gender, genderOther: gender === "other" ? value.genderOther : null })
          }}
          disabled={isDisabled}
          className="sm:grid-cols-2"
          aria-required={isRequired || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [isRequired ? descriptionId : null, error ? errorId : null].filter(Boolean).join(" ") ||
            undefined
          }
        >
          {GENDERS.map((gender) => (
            <Field
              key={gender}
              orientation="horizontal"
            >
              <RadioGroupItem
                id={`${id}-${gender}`}
                value={gender}
                aria-controls={gender === "other" && value.gender === "other" ? otherId : undefined}
              />
              <FieldLabel htmlFor={`${id}-${gender}`}>{GENDER_LABELS[gender]}</FieldLabel>
            </Field>
          ))}
        </RadioGroup>
        {value.gender === "other" ? (
          // Under its option, aligned with the option labels; half the width
          // only where the options stand in two columns.
          <div className="@container pl-6">
            <Field className="@md:w-1/2">
              <FieldLabel htmlFor={otherId}>Vlastní odpověď (nepovinné)</FieldLabel>
              <Input
                id={otherId}
                placeholder="Napište vlastní odpověď"
                value={value.genderOther ?? ""}
                maxLength={GENDER_OTHER_MAX_LENGTH}
                disabled={isDisabled}
                onChange={(event) => onChange({ gender: "other", genderOther: event.target.value })}
              />
            </Field>
          </div>
        ) : null}
        {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      </FieldSet>
    </div>
  )
}
