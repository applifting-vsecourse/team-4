import { useState } from "react"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export type EvaluationMode = "automatic" | "manual"

export type EvaluationModeSettingsProps = {
  /** The saved mode; the form starts on it. */
  mode: EvaluationMode
  /** A failed save: which mode still applies, already worded. */
  saveError?: string
  onSave?: (mode: EvaluationMode) => void
  isSaving?: boolean
}

// Správa akce → Nastavení → Automatizace (F13-1; spec v4 §5): whether the
// proposal of a term is recalculated on its own after a change of inputs, or
// only from "Přepočítat". Neither mode confirms anybody. Design only: every
// value is passed in.
export function EvaluationModeSettings({
  mode,
  saveError,
  onSave,
  isSaving = false,
}: EvaluationModeSettingsProps) {
  const [selected, setSelected] = useState<EvaluationMode>(mode)

  return (
    <Card>
      <CardContent>
        <FieldSet>
          <FieldLegend variant="label">Vyhodnocení účasti</FieldLegend>
          <RadioGroup
            value={selected}
            onValueChange={(value) => setSelected(value as EvaluationMode)}
          >
            <Field orientation="horizontal">
              <RadioGroupItem
                id="mode-automatic"
                value="automatic"
              />
              <FieldLabel htmlFor="mode-automatic">
                Přepočítat návrh automaticky po každé změně
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem
                id="mode-manual"
                value="manual"
              />
              <FieldLabel htmlFor="mode-manual">
                Přepočítat návrh jen tlačítkem Přepočítat
              </FieldLabel>
            </Field>
          </RadioGroup>
          {saveError ? (
            <FormError
              title="Režim se nepodařilo uložit"
              message={saveError}
            />
          ) : null}
        </FieldSet>
      </CardContent>
      <CardFooter className="justify-end">
        <PendingButton
          isPending={isSaving}
          disabled={selected === mode}
          onClick={() => onSave?.(selected)}
        >
          Uložit
        </PendingButton>
      </CardFooter>
    </Card>
  )
}
