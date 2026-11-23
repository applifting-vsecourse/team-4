import { useState } from "react"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { EventAttribute } from "@/features/accommodation/api/evaluationSchemas"
import { AnswerSelectionDisclosure } from "@/features/accommodation/components/AnswerSelectionDisclosure"

/** The select value for rooms without a hard attribute; options are attribute codes. */
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

// Správa akce → Nastavení → Pravidla ubytování (#384, #485): one compact
// choice decides whether rooms are split. Missing answers always go to manual
// placement; selected exceptions do too.
export function HardAttributeSettings({
  hardAttribute,
  nonDeterminingValues,
  options,
  saveError,
  onSave,
  isSaving = false,
}: HardAttributeSettingsProps) {
  const [chosen, setChosen] = useState(hardAttribute ?? NONE)
  const [chosenNonDetermining, setNonDetermining] = useState(nonDeterminingValues)
  // A question removed before this choice was saved (#485): the saved rule applies.
  const isGone = chosen !== NONE && !options.some((candidate) => candidate.attribute === chosen)
  const selected = isGone ? (hardAttribute ?? NONE) : chosen
  const nonDetermining = isGone ? nonDeterminingValues : chosenNonDetermining
  const option = options.find((candidate) => candidate.attribute === selected)
  const gender = options.find((candidate) => candidate.attribute === "gender")
  const choose = (attribute: string) => {
    setChosen(attribute)
    // The saved answers for the saved question, the defaults for another.
    setNonDetermining(
      attribute === hardAttribute
        ? nonDeterminingValues
        : (options.find((candidate) => candidate.attribute === attribute)
            ?.defaultNonDeterminingValues ?? []),
    )
  }
  const isUnchanged =
    selected === (hardAttribute ?? NONE) &&
    (selected === NONE || sameSet(nonDetermining, nonDeterminingValues))

  return (
    <Card>
      <CardContent>
        <div className="space-y-3">
          <Field>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <FieldLabel htmlFor="hard-attribute-select">Pokoje dělit podle</FieldLabel>
              {option?.attribute === "gender" ? (
                <Badge variant="outline">Přednastavená otázka</Badge>
              ) : null}
            </div>
            <Select
              value={selected}
              onValueChange={choose}
            >
              <SelectTrigger
                id="hard-attribute-select"
                aria-label="Pokoje dělit podle"
                className="w-full sm:w-fit"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Bez rozdělení</SelectItem>
                {gender ? <SelectItem value="gender">Pohlaví pro ubytování</SelectItem> : null}
                {options
                  .filter((candidate) => candidate.attribute !== "gender")
                  .map((candidate) => (
                    <SelectItem
                      key={candidate.attribute}
                      value={candidate.attribute}
                    >
                      {candidate.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>

          {option ? (
            <div className="space-y-2">
              <FieldDescription>Různé odpovědi znamenají oddělené pokoje.</FieldDescription>
              <AnswerSelectionDisclosure
                id={`manual-placement-${option.attribute}`}
                title="Komu určit pokoj ručně"
                summary={[
                  ...option.values
                    .filter(({ value }) => nonDetermining.includes(value))
                    .map(({ label }) => label),
                  "Chybějící odpověď",
                ].join(" · ")}
                options={option.values}
                selectedValues={nonDetermining}
                explanation="Účastníkům bez vyplněné odpovědi určíte pokoj vždy ručně."
                onSelectionChange={(value, isChecked) =>
                  setNonDetermining((current) =>
                    isChecked ? [...current, value] : current.filter((other) => other !== value),
                  )
                }
              />
            </div>
          ) : (
            <FieldDescription>
              Pokoj mohou sdílet všichni. Návrh zohlední kapacity a preference.
            </FieldDescription>
          )}

          {saveError ? (
            <FormError
              title="Pravidlo se nepodařilo uložit"
              message={saveError}
            />
          ) : null}

          <div className="flex justify-end">
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
              Uložit pravidlo
            </PendingButton>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
