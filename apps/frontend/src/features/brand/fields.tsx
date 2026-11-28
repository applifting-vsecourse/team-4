// Brand directions (S5-T03-1, POC): the registration fields every direction keeps from the app,
// so a direction restyles them instead of replacing them with simpler controls.
import { useState } from "react"

import { PhoneField } from "@/components/PhoneField"
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { FORM } from "@/features/brand/data"

/** The app's phone field: country and prefix selector plus the national number. */
export function BrandPhoneField({ id, label = "Telefon" }: { id: string; label?: string }) {
  const [phone, setPhone] = useState(FORM.phone)
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <PhoneField
        id={id}
        value={phone}
        onChange={setPhone}
      />
    </Field>
  )
}

const OTHER = "Jiná odpověď"

// The same answer as the app's GenderField (F64), which another feature cannot import: one option,
// "Jiná odpověď" opens the participant's own words, which stay optional.
export function BrandGenderField({ id }: { id: string }) {
  const [gender, setGender] = useState("")
  const otherId = `${id}-other-words`
  const descriptionId = `${id}-description`
  return (
    <FieldSet>
      <FieldLegend variant="label">Pohlaví pro ubytování</FieldLegend>
      <FieldDescription id={descriptionId}>Pro rozdělení do pokojů.</FieldDescription>
      <RadioGroup
        value={gender}
        onValueChange={setGender}
        aria-required
        aria-describedby={descriptionId}
      >
        {FORM.genders.map((option) => (
          <Field
            key={option}
            orientation="horizontal"
          >
            <RadioGroupItem
              id={`${id}-${option}`}
              value={option}
              aria-controls={option === OTHER && gender === OTHER ? otherId : undefined}
            />
            <FieldLabel htmlFor={`${id}-${option}`}>{option}</FieldLabel>
          </Field>
        ))}
      </RadioGroup>
      {gender === OTHER ? (
        <div className="pl-6">
          <Field>
            <FieldLabel htmlFor={otherId}>Vlastní odpověď (nepovinné)</FieldLabel>
            <Input
              id={otherId}
              placeholder="Napište vlastní odpověď"
              maxLength={100}
            />
          </Field>
        </div>
      ) : null}
    </FieldSet>
  )
}
