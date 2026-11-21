import { useState } from "react"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { EvaluationMode } from "@/features/accommodation/components/EvaluationModeSettings"

export type RoomProposalModeSettingsProps = {
  /** The saved mode; the form starts on it. A new event is `manual`. */
  mode: EvaluationMode
  /** A failed save: which mode still applies, already worded. */
  saveError?: string
  onSave?: (mode: EvaluationMode) => void
  isSaving?: boolean
}

// Správa akce → Nastavení → Automatizace (#385, phase-2 spec §7): whether a
// term's room proposal is made on its own 10 s after a layout change, or only
// from "Navrhnout pokoje". Independent of the evaluation mode; neither mode
// changes a saved placement. Design only: every value is passed in.
export function RoomProposalModeSettings({
  mode,
  saveError,
  onSave,
  isSaving = false,
}: RoomProposalModeSettingsProps) {
  const [selected, setSelected] = useState<EvaluationMode>(mode)

  return (
    <Card>
      <CardContent>
        <FieldSet>
          <FieldLegend variant="label">Návrh pokojů</FieldLegend>
          <RadioGroup
            value={selected}
            onValueChange={(value) => setSelected(value as EvaluationMode)}
          >
            <Field orientation="horizontal">
              <RadioGroupItem
                id="room-proposal-mode-automatic"
                value="automatic"
              />
              <FieldLabel htmlFor="room-proposal-mode-automatic">
                Navrhovat pokoje automaticky po každé změně
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem
                id="room-proposal-mode-manual"
                value="manual"
              />
              <FieldLabel htmlFor="room-proposal-mode-manual">
                Navrhovat pokoje jen ručně
              </FieldLabel>
            </Field>
          </RadioGroup>
          {saveError ? (
            <FormError
              title="Režim návrhu pokojů se nepodařilo uložit"
              message={saveError}
            />
          ) : null}
        </FieldSet>
      </CardContent>
      <CardFooter className="justify-end">
        <PendingButton
          isPending={isSaving}
          // Nothing to save until the choice differs from the saved mode.
          disabled={selected === mode}
          onClick={() => onSave?.(selected)}
        >
          Uložit
        </PendingButton>
      </CardFooter>
    </Card>
  )
}
