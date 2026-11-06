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

import {
  transportChoiceSchema,
  type DietChoice,
  type RegistrationNeeds,
} from "@/features/registrations/api/registrationSchemas"
import {
  DIET_CHOICES,
  DIET_LABELS,
  NO_DIET_RESTRICTION,
  TRANSPORT_LABELS,
  type RegistrationNeedsErrors,
} from "@/features/registrations/lib/registrationNeeds"

export type RegistrationNeedsFieldsProps = {
  defaultValue: RegistrationNeeds
  /** Fields are uncontrolled; this reports every edit to the form that owns the state. */
  onChange?: (needs: RegistrationNeeds) => void
  errors?: RegistrationNeedsErrors
}

// Přihláška na akci / Úprava přihlášky (F63): optional transport, diet and
// health data, entered once for the whole registration. "Bez omezení" and the
// predefined diet choices are mutually exclusive: picking one clears the other.
export function RegistrationNeedsFields({
  defaultValue,
  onChange,
  errors = {},
}: RegistrationNeedsFieldsProps) {
  const [needs, setNeeds] = useState(defaultValue)

  const update = (change: Partial<RegistrationNeeds>) => {
    const next = { ...needs, ...change }
    setNeeds(next)
    onChange?.(next)
  }

  const toggleDiet = (choice: DietChoice, isChecked: boolean) =>
    update({
      diet: isChecked ? [...needs.diet, choice] : needs.diet.filter((item) => item !== choice),
      hasNoDietRestriction: isChecked ? false : needs.hasNoDietRestriction,
    })

  return (
    <FieldGroup>
      <FieldSet>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FieldLegend>Doprava</FieldLegend>
          {needs.transport ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update({ transport: null })}
            >
              Zrušit výběr
            </Button>
          ) : null}
        </div>
        <RadioGroup
          value={needs.transport ?? ""}
          onValueChange={(value) => update({ transport: transportChoiceSchema.parse(value) })}
          aria-label="Doprava"
        >
          {transportChoiceSchema.options.map((choice) => (
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
            value={needs.transportNote}
            onChange={(event) => update({ transportNote: event.target.value })}
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
              checked={needs.hasNoDietRestriction}
              onCheckedChange={(state) =>
                update({
                  hasNoDietRestriction: state === true,
                  diet: state === true ? [] : needs.diet,
                })
              }
            />
            <Label htmlFor="needs-diet-none">{NO_DIET_RESTRICTION}</Label>
          </div>
          {DIET_CHOICES.map((choice) => (
            <div
              key={choice}
              className="flex items-center gap-2"
            >
              <Checkbox
                id={`needs-diet-${choice}`}
                checked={needs.diet.includes(choice)}
                onCheckedChange={(state) => toggleDiet(choice, state === true)}
              />
              <Label htmlFor={`needs-diet-${choice}`}>{DIET_LABELS[choice]}</Label>
            </div>
          ))}
        </div>
        <FieldError>{errors.diet}</FieldError>
        <Field data-invalid={errors.dietNote ? true : undefined}>
          <FieldLabel htmlFor="needs-diet-note">Vlastní text ke stravě</FieldLabel>
          <Input
            id="needs-diet-note"
            value={needs.dietNote}
            onChange={(event) => update({ dietNote: event.target.value })}
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
          value={needs.health}
          onChange={(event) => update({ health: event.target.value })}
          aria-invalid={errors.health ? true : undefined}
        />
        <FieldError>{errors.health}</FieldError>
      </Field>
    </FieldGroup>
  )
}
