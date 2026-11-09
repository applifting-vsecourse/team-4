import { Button } from "@/components/ui/button"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
}

// F64: the voluntary answer for accommodation, one option at most. "Jiná
// odpověď" opens a field for the participant's own words; another option drops
// them. "Zrušit výběr" returns to no answer, which differs from "Nechci uvést".
export function GenderField({ id, value, onChange, isDisabled }: GenderFieldProps) {
  const otherId = `${id}-other-words`
  return (
    <FieldSet>
      <FieldLegend>Pohlaví pro ubytování</FieldLegend>
      <RadioGroup
        value={value.gender ?? ""}
        onValueChange={(next) => {
          const gender = genderSchema.parse(next)
          onChange({ gender, genderOther: gender === "other" ? value.genderOther : null })
        }}
        disabled={isDisabled}
        className="sm:grid-cols-2"
      >
        {GENDERS.map((gender) => (
          <div
            key={gender}
            className="flex items-center gap-2"
          >
            <RadioGroupItem
              id={`${id}-${gender}`}
              value={gender}
              aria-controls={gender === "other" && value.gender === "other" ? otherId : undefined}
            />
            <Label htmlFor={`${id}-${gender}`}>{GENDER_LABELS[gender]}</Label>
          </div>
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
              value={value.genderOther ?? ""}
              maxLength={GENDER_OTHER_MAX_LENGTH}
              disabled={isDisabled}
              onChange={(event) => onChange({ gender: "other", genderOther: event.target.value })}
            />
          </Field>
        </div>
      ) : null}
      {value.gender ? (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isDisabled}
            onClick={() => onChange(NO_GENDER_ANSWER)}
          >
            Zrušit výběr
          </Button>
        </div>
      ) : null}
    </FieldSet>
  )
}
