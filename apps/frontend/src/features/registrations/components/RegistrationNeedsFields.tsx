import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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

  const hasDietSelection = needs.hasNoDietRestriction || needs.diet.length > 0

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="rounded-lg border border-border bg-background p-4 sm:p-5">
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
              <Field
                key={choice}
                orientation="horizontal"
              >
                <RadioGroupItem
                  id={`needs-transport-${choice}`}
                  value={choice}
                />
                <FieldLabel htmlFor={`needs-transport-${choice}`}>
                  {TRANSPORT_LABELS[choice]}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
          <Field data-invalid={errors.transportNote ? true : undefined}>
            <FieldLabel htmlFor="needs-transport-note">Poznámka k dopravě</FieldLabel>
            <Input
              id="needs-transport-note"
              placeholder="Např. odjezd z Brna"
              value={needs.transportNote}
              onChange={(event) => update({ transportNote: event.target.value })}
              aria-invalid={errors.transportNote ? true : undefined}
            />
            <FieldError>{errors.transportNote}</FieldError>
          </Field>
        </FieldSet>
      </div>

      <div className="rounded-lg border border-border bg-background p-4 sm:p-5">
        <FieldSet>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FieldLegend>Strava</FieldLegend>
            {hasDietSelection ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => update({ hasNoDietRestriction: false, diet: [] })}
              >
                Zrušit výběr
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              orientation="horizontal"
              className="sm:col-span-2"
            >
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
              <FieldLabel htmlFor="needs-diet-none">{NO_DIET_RESTRICTION}</FieldLabel>
            </Field>
            {DIET_CHOICES.map((choice) => (
              <Field
                key={choice}
                orientation="horizontal"
              >
                <Checkbox
                  id={`needs-diet-${choice}`}
                  checked={needs.diet.includes(choice)}
                  onCheckedChange={(state) => toggleDiet(choice, state === true)}
                />
                <FieldLabel htmlFor={`needs-diet-${choice}`}>{DIET_LABELS[choice]}</FieldLabel>
              </Field>
            ))}
          </div>
          <FieldError>{errors.diet}</FieldError>
          <Field data-invalid={errors.dietNote ? true : undefined}>
            <FieldLabel htmlFor="needs-diet-note">Vlastní text ke stravě</FieldLabel>
            <Input
              id="needs-diet-note"
              placeholder="Např. alergie na ořechy"
              value={needs.dietNote}
              onChange={(event) => update({ dietNote: event.target.value })}
              aria-invalid={errors.dietNote ? true : undefined}
            />
            <FieldError>{errors.dietNote}</FieldError>
          </Field>
        </FieldSet>
      </div>

      <div className="rounded-lg border border-border bg-background p-4 sm:p-5">
        <FieldSet>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FieldLegend>Zdravotní omezení</FieldLegend>
          </div>
          <Field data-invalid={errors.health ? true : undefined}>
            <Textarea
              id="needs-health"
              aria-label="Zdravotní omezení"
              placeholder="Popište omezení, léky nebo důležité informace."
              rows={4}
              value={needs.health}
              onChange={(event) => update({ health: event.target.value })}
              aria-invalid={errors.health ? true : undefined}
            />
            <FieldError>{errors.health}</FieldError>
          </Field>
        </FieldSet>
      </div>
    </div>
  )
}
