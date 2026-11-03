import { Button } from "@/components/ui/button"
import { FieldLegend, FieldSet } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { genderSchema, type Gender } from "@/features/registrations/api/registrationSchemas"
import { GENDER_LABELS, GENDERS } from "@/features/registrations/lib/gender"

type GenderFieldProps = {
  /** Prefix of the option ids; unique on the page. */
  id: string
  /** Null is "not answered": no option selected. */
  value: Gender | null
  onChange: (value: Gender | null) => void
  isDisabled?: boolean
}

// F64: the voluntary answer for accommodation, one option at most. "Zrušit
// výběr" returns to no answer, which differs from "Nechci uvést".
export function GenderField({ id, value, onChange, isDisabled }: GenderFieldProps) {
  return (
    <FieldSet>
      <FieldLegend>Pohlaví pro ubytování (nepovinné)</FieldLegend>
      <RadioGroup
        value={value ?? ""}
        onValueChange={(next) => onChange(genderSchema.parse(next))}
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
            />
            <Label htmlFor={`${id}-${gender}`}>{GENDER_LABELS[gender]}</Label>
          </div>
        ))}
      </RadioGroup>
      {value ? (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isDisabled}
            onClick={() => onChange(null)}
          >
            Zrušit výběr
          </Button>
        </div>
      ) : null}
    </FieldSet>
  )
}
