import { useState } from "react"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { attributeLabel } from "@/features/accommodation/lib/evaluationView"

/** The radio value of "no hard attribute"; options are attribute codes. */
const NONE = "none"

export type HardAttributeSettingsProps = {
  /** The saved choice; null when rooms are not split. The form starts on it. */
  hardAttribute: string | null
  /** The categorical questions the organizer can choose from, e.g. `gender`. */
  options: { attribute: string }[]
  /** A failed save: which choice still applies, already worded. */
  saveError?: string
  onSave?: (hardAttribute: string | null) => void
  isSaving?: boolean
}

// Správa akce → Nastavení → Pravidla ubytování (#384): none or one
// categorical question splits rooms, so people with different answers never
// share one. Design only: every value is passed in.
export function HardAttributeSettings({
  hardAttribute,
  options,
  saveError,
  onSave,
  isSaving = false,
}: HardAttributeSettingsProps) {
  const [selected, setSelected] = useState(hardAttribute ?? NONE)

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <FieldSet>
            <FieldLegend>Pokoje dělit podle</FieldLegend>
            <RadioGroup
              value={selected}
              onValueChange={setSelected}
            >
              <Field orientation="horizontal">
                <RadioGroupItem
                  id="hard-attribute-none"
                  value={NONE}
                />
                <FieldLabel htmlFor="hard-attribute-none">Nedělit</FieldLabel>
              </Field>
              {options.map((option) => (
                <Field
                  key={option.attribute}
                  orientation="horizontal"
                >
                  <RadioGroupItem
                    id={`hard-attribute-${option.attribute}`}
                    value={option.attribute}
                  />
                  <FieldLabel htmlFor={`hard-attribute-${option.attribute}`}>
                    {attributeLabel(option.attribute)}
                  </FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          </FieldSet>
          {saveError ? (
            <FormError
              title="Pravidlo se nepodařilo uložit"
              message={saveError}
            />
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <PendingButton
          isPending={isSaving}
          onClick={() => onSave?.(selected === NONE ? null : selected)}
        >
          Uložit
        </PendingButton>
      </CardFooter>
    </Card>
  )
}
