import { useEffect, useRef, useState } from "react"
import { GripVertical, Plus, X } from "lucide-react"

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

import type { EventAttribute } from "@/features/accommodation/api/evaluationSchemas"
import type { SoftPreferenceItem } from "@/features/accommodation/api/roomProposalSchemas"
import { attributeLabels, type AttributeLabels } from "@/features/accommodation/lib/evaluationView"

/** A categorical question the organizer can rank, with its answers. */
export type RoomProposalPreferencesProps = {
  /** The saved list, most important first. The form starts on it. */
  preferences: SoftPreferenceItem[]
  /** The id of "Přání". */
  wishes: string
  /** The soft attributes that can be ranked; never the hard attribute. */
  attributes: EventAttribute[]
  /** A failed save: which list still applies, already worded. */
  saveError?: string
  onSave?: (preferences: SoftPreferenceItem[]) => void
  isSaving?: boolean
}

/** The name of an item in the list and the menu; a question by the event's labels (#485). */
export const preferenceLabel = (id: string, wishes: string, labels: AttributeLabels) =>
  id === wishes ? "Přání" : labels.attribute(id)

const handleId = (id: string) => `preference-${id}-handle`

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
  const labels = attributeLabels(attributes)
  const [items, setItems] = useState(preferences)
  const [toAdd, setToAdd] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null)
  const [keyboardItemId, setKeyboardItemId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const keyboardOriginal = useRef<SoftPreferenceItem[] | null>(null)

  useEffect(() => {
    if (keyboardItemId) document.getElementById(handleId(keyboardItemId))?.focus()
  }, [keyboardItemId, items])

  const announcePosition = (id: string, list: SoftPreferenceItem[]) => {
    const label = preferenceLabel(id, wishes, labels)
    const index = list.findIndex((item) => item.id === id)
    setAnnouncement(`${label}, pozice ${index + 1} z ${list.length}.`)
  }

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return
    const next = move(items, from, to)
    setItems(next)
    announcePosition(next[to]!.id, next)
    return next
  }

  const startKeyboardMove = (id: string) => {
    keyboardOriginal.current = items
    setKeyboardItemId(id)
    setAnnouncement(
      `${preferenceLabel(id, wishes, labels)} je na pozici ${items.findIndex((item) => item.id === id) + 1} z ${items.length}. Přesuňte šipkami, položte mezerníkem nebo zrušte klávesou Escape.`,
    )
  }

  const finishKeyboardMove = () => {
    if (!keyboardItemId) return
    announcePosition(keyboardItemId, items)
    keyboardOriginal.current = null
    setKeyboardItemId(null)
  }

  const cancelKeyboardMove = () => {
    if (!keyboardItemId) return
    const original = keyboardOriginal.current ?? items
    setItems(original)
    setAnnouncement(`Přesun ${preferenceLabel(keyboardItemId, wishes, labels)} zrušen.`)
    keyboardOriginal.current = null
    setKeyboardItemId(null)
  }

  const dropAt = (fromId: string, to: number) => {
    const from = items.findIndex((item) => item.id === fromId)
    const next = moveItem(from, Math.max(0, Math.min(to, items.length - 1)))
    if (!next) announcePosition(fromId, items)
    setDraggedId(null)
    setInsertionIndex(null)
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
    setIsAdding(false)
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
            <FieldDescription>První položka má nejvyšší prioritu.</FieldDescription>
            {items.length ? (
              <ol className="space-y-2">
                {items.map((item, index) => {
                  const label = preferenceLabel(item.id, wishes, labels)
                  const option = optionOf(item.id)
                  return (
                    <li
                      key={item.id}
                      onDragOver={(event) => {
                        if (!draggedId) return
                        event.preventDefault()
                        const rect = event.currentTarget.getBoundingClientRect()
                        const isAfter = event.clientY >= rect.top + rect.height / 2
                        const boundary = index + (isAfter ? 1 : 0)
                        setInsertionIndex(
                          boundary > items.findIndex((candidate) => candidate.id === draggedId)
                            ? boundary - 1
                            : boundary,
                        )
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        if (draggedId) dropAt(draggedId, insertionIndex ?? index)
                      }}
                      className={`space-y-3 rounded-md border border-border bg-muted/40 p-3 ${
                        draggedId === item.id ? "opacity-50" : ""
                      } ${insertionIndex === index ? "border-t-2 border-t-ring" : ""} ${
                        insertionIndex === items.length && index === items.length - 1
                          ? "border-b-2 border-b-ring"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {items.length > 1 ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            id={handleId(item.id)}
                            aria-label={`Přesunout ${label}`}
                            aria-pressed={keyboardItemId === item.id}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move"
                              event.dataTransfer.setData("text/plain", item.id)
                              setDraggedId(item.id)
                            }}
                            onDragEnd={() => {
                              setDraggedId(null)
                              setInsertionIndex(null)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === " " || event.key === "Spacebar") {
                                event.preventDefault()
                                if (keyboardItemId === item.id) finishKeyboardMove()
                                else if (!keyboardItemId) startKeyboardMove(item.id)
                              } else if (keyboardItemId === item.id && event.key === "Escape") {
                                event.preventDefault()
                                cancelKeyboardMove()
                              } else if (keyboardItemId === item.id && event.key === "ArrowUp") {
                                event.preventDefault()
                                moveItem(index, index - 1)
                              } else if (keyboardItemId === item.id && event.key === "ArrowDown") {
                                event.preventDefault()
                                moveItem(index, index + 1)
                              }
                            }}
                            className="cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical
                              aria-hidden
                              className="size-4 text-muted-foreground"
                            />
                          </Button>
                        ) : null}
                        <span className="w-6 text-muted-foreground tabular-nums">{index + 1}.</span>
                        <span className="min-w-0 flex-1 font-medium">{label}</span>
                        <div className="flex shrink-0 gap-1">
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
                            Neutrální i prázdné odpovědi se nehodnotí.
                          </FieldDescription>
                          <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {option.values.map(({ value, label: valueText }) => {
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
                                  <FieldLabel htmlFor={id}>{valueText}</FieldLabel>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Žádné preference nejsou přidané.</p>
                {available.length ? (
                  <Button
                    variant="outline"
                    onClick={() => setIsAdding(true)}
                  >
                    <Plus />
                    Přidat preferenci
                  </Button>
                ) : null}
              </div>
            )}
          </FieldSet>
          {items.length > 0 && available.length && !isAdding ? (
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
            >
              <Plus />
              Přidat preferenci
            </Button>
          ) : null}
          {available.length && isAdding ? (
            <Field>
              <FieldLabel htmlFor="room-proposal-preference-add">Nová preference</FieldLabel>
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
                        {preferenceLabel(id, wishes, labels)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="secondary"
                  disabled={!toAdd}
                  onClick={add}
                >
                  <Plus />
                  Přidat
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setToAdd("")
                    setIsAdding(false)
                  }}
                >
                  Zrušit
                </Button>
              </div>
            </Field>
          ) : null}
          <span
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            {announcement}
          </span>
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
