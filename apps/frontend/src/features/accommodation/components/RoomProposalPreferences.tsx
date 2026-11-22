import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react"

import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { SoftPreferenceItem } from "@/features/accommodation/api/roomProposalSchemas"
import { attributeLabel, valueLabel } from "@/features/accommodation/lib/evaluationView"

/** A categorical question the organizer can rank, with its answers. */
export type SoftAttributeChoice = {
  attribute: string
  values: string[]
  defaultNeutralValues: string[]
}

export type RoomProposalPreferencesProps = {
  /** The saved list, most important first. The form starts on it. */
  preferences: SoftPreferenceItem[]
  /** The id of "Přání". */
  wishes: string
  /** The soft attributes that can be ranked; never the hard attribute. */
  attributes: SoftAttributeChoice[]
  /** A failed save: which list still applies, already worded. */
  saveError?: string
  onSave?: (preferences: SoftPreferenceItem[]) => void
  isSaving?: boolean
}

/** The name of an item in the list and the menu. */
export const preferenceLabel = (id: string, wishes: string) =>
  id === wishes ? "Přání" : attributeLabel(id)

const arrowId = (id: string, direction: "up" | "down") => `preference-${id}-${direction}`

/** The same ranking and the same neutral answers of each item (in any order). */
export const samePreferences = (a: SoftPreferenceItem[], b: SoftPreferenceItem[]) =>
  a.length === b.length &&
  a.every((item, index) => {
    const other = b[index]!
    const values = new Set(item.neutralValues ?? [])
    const otherValues = other.neutralValues ?? []
    return (
      item.id === other.id &&
      values.size === otherValues.length &&
      otherValues.every((value) => values.has(value))
    )
  })

const move = <T,>(items: T[], from: number, to: number): T[] => {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

// Správa akce → Nastavení → Návrh pokojů (#389): the organizer picks and
// ranks the soft preferences of the room proposal; each one outranks every
// one below it. A soft attribute has neutral answers that never count; a
// missing answer is always neutral. Design only: every value is passed in.
export function RoomProposalPreferences({
  preferences,
  wishes,
  attributes,
  saveError,
  onSave,
  isSaving = false,
}: RoomProposalPreferencesProps) {
  const [items, setItems] = useState(preferences)
  const [toAdd, setToAdd] = useState("")
  // A move to the top or bottom disables the pressed arrow; keyboard focus
  // goes to the other arrow of the moved item instead of the page.
  const focusAfterMove = useRef<string | null>(null)

  useEffect(() => {
    if (focusAfterMove.current === null) return
    document.getElementById(focusAfterMove.current)?.focus()
    focusAfterMove.current = null
  })

  const moveItem = (index: number, to: number) => {
    const id = items[index]!.id
    setItems(move(items, index, to))
    if (to === 0) focusAfterMove.current = arrowId(id, "down")
    else if (to === items.length - 1) focusAfterMove.current = arrowId(id, "up")
  }

  const available = [
    ...(items.some((item) => item.id === wishes) ? [] : [wishes]),
    ...attributes
      .map((option) => option.attribute)
      .filter((attribute) => !items.some((item) => item.id === attribute)),
  ]
  const optionOf = (id: string) => attributes.find((option) => option.attribute === id)

  const add = () => {
    if (!available.includes(toAdd)) return
    const option = optionOf(toAdd)
    setItems([
      ...items,
      option ? { id: toAdd, neutralValues: [...option.defaultNeutralValues] } : { id: toAdd },
    ])
    setToAdd("")
  }

  const setNeutral = (index: number, value: string, isNeutral: boolean) =>
    setItems(
      items.map((item, i) => {
        if (i !== index) return item
        const neutral = (item.neutralValues ?? []).filter((v) => v !== value)
        return { ...item, neutralValues: isNeutral ? [...neutral, value] : neutral }
      }),
    )

  return (
    <Card>
      <CardContent>
        <div className="space-y-6">
          <FieldSet>
            <FieldLegend>Pořadí preferencí</FieldLegend>
            <FieldDescription>
              Návrh pokojů splní co nejlépe první preferenci, pak druhou a tak dál. Výš uvedená má
              vždy přednost.
            </FieldDescription>
            {items.length ? (
              <ol className="divide-y divide-border">
                {items.map((item, index) => {
                  const label = preferenceLabel(item.id, wishes)
                  const option = optionOf(item.id)
                  return (
                    <li
                      key={item.id}
                      className="space-y-3 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-muted-foreground">{index + 1}.</span>
                        <span className="min-w-0 flex-1 font-medium">{label}</span>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            id={arrowId(item.id, "up")}
                            aria-label={`Posunout ${label} výš`}
                            disabled={index === 0}
                            onClick={() => moveItem(index, index - 1)}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            id={arrowId(item.id, "down")}
                            aria-label={`Posunout ${label} níž`}
                            disabled={index === items.length - 1}
                            onClick={() => moveItem(index, index + 1)}
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Odebrat ${label}`}
                            onClick={() => setItems(items.filter((_, i) => i !== index))}
                          >
                            <X />
                          </Button>
                        </div>
                      </div>
                      {option ? (
                        <FieldSet className="ml-9">
                          <FieldLegend variant="label">Neutrální hodnoty: {label}</FieldLegend>
                          <FieldDescription>
                            Tyto odpovědi se nepočítají, stejně jako nevyplněná odpověď.
                          </FieldDescription>
                          <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {option.values.map((value) => {
                              const id = `neutral-${item.id}-${value}`
                              return (
                                <Field
                                  key={value}
                                  orientation="horizontal"
                                >
                                  <Checkbox
                                    id={id}
                                    checked={item.neutralValues?.includes(value) ?? false}
                                    onCheckedChange={(checked) =>
                                      setNeutral(index, value, checked === true)
                                    }
                                  />
                                  <FieldLabel htmlFor={id}>{valueLabel(item.id, value)}</FieldLabel>
                                </Field>
                              )
                            })}
                          </div>
                        </FieldSet>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bez měkkých preferencí. Návrh pokojů zohlední jen lůžka, tvrdé pravidlo a uložená
                umístění.
              </p>
            )}
          </FieldSet>
          {available.length ? (
            <Field>
              <FieldLabel htmlFor="room-proposal-preference-add">Přidat preferenci</FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={toAdd}
                  onValueChange={setToAdd}
                >
                  <SelectTrigger
                    id="room-proposal-preference-add"
                    className="w-56"
                  >
                    <SelectValue placeholder="Vyberte preferenci" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((id) => (
                      <SelectItem
                        key={id}
                        value={id}
                      >
                        {preferenceLabel(id, wishes)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={!toAdd}
                  onClick={add}
                >
                  <Plus />
                  Přidat
                </Button>
              </div>
            </Field>
          ) : null}
          {saveError ? (
            <FormError
              title="Preference se nepodařilo uložit"
              message={saveError}
            />
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <PendingButton
          isPending={isSaving}
          // Nothing to save until the list differs from the saved one.
          disabled={samePreferences(items, preferences)}
          onClick={() => onSave?.(items)}
        >
          Uložit
        </PendingButton>
      </CardFooter>
    </Card>
  )
}
