import { useState } from "react"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { EventAttribute } from "@/features/accommodation/api/evaluationSchemas"

/** The radio value of "no hard attribute"; options are attribute codes. */
const NONE = "none"

export type HardAttributeChoice = {
  hardAttribute: string | null
  /** Its answers that decide no room; empty without a hard attribute. */
  nonDeterminingValues: string[]
}

export type HardAttributeSettingsProps = HardAttributeChoice & {
  /** The categorical questions to choose from: gender and the event's own (#485). */
  options: EventAttribute[]
  /** A failed save: which choice still applies, already worded. */
  saveError?: string
  onSave?: (choice: HardAttributeChoice) => void
  isSaving?: boolean
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((value) => b.includes(value))

// Správa akce → Nastavení → Pravidla ubytování (#384, #485): none or one
// categorical question splits rooms, so people with different answers never
// share one; its answers marked here decide no room and leave it to the
// organizer, as a missing answer always does. Design only: every value is
// passed in.
export function HardAttributeSettings({
  hardAttribute,
  nonDeterminingValues,
  options,
  saveError,
  onSave,
  isSaving = false,
}: HardAttributeSettingsProps) {
  const [chosen, setSelected] = useState(hardAttribute ?? NONE)
  const [chosenNonDetermining, setNonDetermining] = useState(nonDeterminingValues)
  // A question removed before this choice was saved (#485): the saved rule applies.
  const isGone = chosen !== NONE && !options.some((candidate) => candidate.attribute === chosen)
  const selected = isGone ? (hardAttribute ?? NONE) : chosen
  const nonDetermining = isGone ? nonDeterminingValues : chosenNonDetermining
  const option = options.find((candidate) => candidate.attribute === selected)

  const choose = (attribute: string) => {
    setSelected(attribute)
    // The saved answers for the saved question, the defaults for another.
    setNonDetermining(
      attribute === hardAttribute
        ? nonDeterminingValues
        : (options.find((o) => o.attribute === attribute)?.defaultNonDeterminingValues ?? []),
    )
  }
  const toggle = (value: string, isChecked: boolean) =>
    setNonDetermining((current) =>
      isChecked ? [...current, value] : current.filter((other) => other !== value),
    )
  const isUnchanged =
    selected === (hardAttribute ?? NONE) &&
    (selected === NONE || sameSet(nonDetermining, nonDeterminingValues))

  return (
    <Card>
      <CardContent>
        <div className="space-y-6">
          <FieldSet>
            <FieldLegend>Pokoje dělit podle</FieldLegend>
            <RadioGroup
              value={selected}
              onValueChange={choose}
            >
              <Field orientation="horizontal">
                <RadioGroupItem
                  id="hard-attribute-none"
                  value={NONE}
                />
                <FieldLabel htmlFor="hard-attribute-none">Nedělit</FieldLabel>
              </Field>
              {options.map((candidate) => (
                <Field
                  key={candidate.attribute}
                  orientation="horizontal"
                >
                  <RadioGroupItem
                    id={`hard-attribute-${candidate.attribute}`}
                    value={candidate.attribute}
                  />
                  <FieldLabel htmlFor={`hard-attribute-${candidate.attribute}`}>
                    {candidate.label}
                  </FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          </FieldSet>
          {option ? (
            <FieldSet>
              <FieldLegend variant="label">Odpovědi, které o pokoji nerozhodují</FieldLegend>
              <FieldDescription>
                Účastníkovi s takovou odpovědí, nebo bez odpovědi, určíte pokoj ručně.
              </FieldDescription>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {option.values.map(({ value, label }) => {
                  const id = `non-determining-${option.attribute}-${value}`
                  return (
                    <Field
                      key={value}
                      orientation="horizontal"
                    >
                      <Checkbox
                        id={id}
                        checked={nonDetermining.includes(value)}
                        onCheckedChange={(checked) => toggle(value, checked === true)}
                      />
                      <FieldLabel htmlFor={id}>{label}</FieldLabel>
                    </Field>
                  )
                })}
              </div>
            </FieldSet>
          ) : null}
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
          disabled={isUnchanged}
          onClick={() =>
            onSave?.(
              selected === NONE
                ? { hardAttribute: null, nonDeterminingValues: [] }
                : { hardAttribute: selected, nonDeterminingValues: nonDetermining },
            )
          }
        >
          Uložit
        </PendingButton>
      </CardFooter>
    </Card>
  )
}
