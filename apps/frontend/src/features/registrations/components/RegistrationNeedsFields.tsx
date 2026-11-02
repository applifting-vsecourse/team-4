import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

export type TransportChoice = "own" | "shared"
export type DietChoice = "vegetarian" | "vegan" | "glutenFree" | "lactoseFree"

export type RegistrationNeedsValues = {
  transport: TransportChoice | null
  transportNote: string
  /** "Bez omezení" is exclusive: when set, the predefined choices are empty. */
  hasNoDietRestriction: boolean
  diet: DietChoice[]
  dietNote: string
  health: string
}

export type RegistrationNeedsErrors = {
  transportNote?: string
  dietNote?: string
  health?: string
}

export type RegistrationNeedsFieldsProps = {
  values: RegistrationNeedsValues
  errors?: RegistrationNeedsErrors
}

export const TRANSPORT_LABELS: Record<TransportChoice, string> = {
  own: "Vlastní doprava",
  shared: "Společná doprava",
}

export const DIET_LABELS: Record<DietChoice, string> = {
  vegetarian: "Vegetariánská",
  vegan: "Veganská",
  glutenFree: "Bezlepková",
  lactoseFree: "Bezlaktózová",
}

const DIET_CHOICES = Object.keys(DIET_LABELS) as DietChoice[]

// Přihláška na akci / Úprava přihlášky (F63): optional transport, diet and
// health data, entered once for the whole registration. Design only: every
// value is passed in. The only local state keeps "Bez omezení" and the
// predefined diet choices mutually exclusive: picking one clears the other.
export function RegistrationNeedsFields({ values, errors = {} }: RegistrationNeedsFieldsProps) {
  const [hasNoDietRestriction, setHasNoDietRestriction] = useState(values.hasNoDietRestriction)
  const [diet, setDiet] = useState<DietChoice[]>(values.diet)

  const toggleNoDietRestriction = (isChecked: boolean) => {
    setHasNoDietRestriction(isChecked)
    if (isChecked) setDiet([])
  }

  const toggleDiet = (choice: DietChoice, isChecked: boolean) => {
    setDiet((current) =>
      isChecked ? [...current, choice] : current.filter((item) => item !== choice),
    )
    if (isChecked) setHasNoDietRestriction(false)
  }

  return (
    <FieldGroup>
      <FieldSet>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FieldLegend>Doprava</FieldLegend>
          {values.transport ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
            >
              Zrušit výběr
            </Button>
          ) : null}
        </div>
        <RadioGroup
          defaultValue={values.transport ?? undefined}
          aria-label="Doprava"
        >
          {(Object.keys(TRANSPORT_LABELS) as TransportChoice[]).map((choice) => (
            <div
              key={choice}
              className="flex items-center gap-2"
            >
              <RadioGroupItem
                id={`needs-transport-${choice}`}
                value={choice}
              />
              <Label htmlFor={`needs-transport-${choice}`}>{TRANSPORT_LABELS[choice]}</Label>
            </div>
          ))}
        </RadioGroup>
        <Field data-invalid={errors.transportNote ? true : undefined}>
          <FieldLabel htmlFor="needs-transport-note">Poznámka k dopravě</FieldLabel>
          <Input
            id="needs-transport-note"
            defaultValue={values.transportNote}
            aria-invalid={errors.transportNote ? true : undefined}
          />
          <FieldError>{errors.transportNote}</FieldError>
        </Field>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Strava</FieldLegend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="needs-diet-none"
              checked={hasNoDietRestriction}
              onCheckedChange={(state) => toggleNoDietRestriction(state === true)}
            />
            <Label htmlFor="needs-diet-none">Bez omezení</Label>
          </div>
          {DIET_CHOICES.map((choice) => (
            <div
              key={choice}
              className="flex items-center gap-2"
            >
              <Checkbox
                id={`needs-diet-${choice}`}
                checked={diet.includes(choice)}
                onCheckedChange={(state) => toggleDiet(choice, state === true)}
              />
              <Label htmlFor={`needs-diet-${choice}`}>{DIET_LABELS[choice]}</Label>
            </div>
          ))}
        </div>
        <Field data-invalid={errors.dietNote ? true : undefined}>
          <FieldLabel htmlFor="needs-diet-note">Vlastní text ke stravě</FieldLabel>
          <Input
            id="needs-diet-note"
            defaultValue={values.dietNote}
            aria-invalid={errors.dietNote ? true : undefined}
          />
          <FieldError>{errors.dietNote}</FieldError>
        </Field>
      </FieldSet>

      <Field data-invalid={errors.health ? true : undefined}>
        <FieldLabel htmlFor="needs-health">Zdravotní omezení</FieldLabel>
        <Textarea
          id="needs-health"
          rows={4}
          defaultValue={values.health}
          aria-invalid={errors.health ? true : undefined}
        />
        <FieldError>{errors.health}</FieldError>
      </Field>
    </FieldGroup>
  )
}
