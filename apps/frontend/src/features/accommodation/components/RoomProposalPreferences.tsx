import { useEffect, useRef, useState } from "react"
import { GripVertical, Plus, X } from "lucide-react"

import { ActionTooltip } from "@/components/ActionTooltip"
import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FieldDescription, FieldLegend } from "@/components/ui/field"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { EventAttribute } from "@/features/accommodation/api/evaluationSchemas"
import type { SoftPreferenceItem } from "@/features/accommodation/api/roomProposalSchemas"
import { AnswerSelectionDisclosure } from "@/features/accommodation/components/AnswerSelectionDisclosure"
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
  id === wishes ? "Přání na spolubydlící" : labels.attribute(id)

const handleId = (id: string) => `preference-${id}-handle`

const PREFERENCE_SOURCES = {
  wishes: {
    label: "Z přihlášek",
    tooltip: "Spolubydlící si účastníci vybírají ve správě přihlášky.",
  },
  gender: {
    label: "Přednastavená otázka",
    tooltip: "Vychází z odpovědí účastníků na přednastavenou otázku o pohlaví pro ubytování.",
  },
  question: {
    label: "Vlastní otázka",
    tooltip: "Vychází z odpovědí účastníků na otázku, kterou jste přidali do přihlášky.",
  },
} as const

function PreferenceSourceBadge({ id, wishes }: { id: string; wishes: string }) {
  const [isOpen, setOpen] = useState(false)
  const badgeRef = useRef<HTMLSpanElement>(null)
  const source =
    id === wishes
      ? PREFERENCE_SOURCES.wishes
      : id === "gender"
        ? PREFERENCE_SOURCES.gender
        : PREFERENCE_SOURCES.question

  useEffect(() => {
    if (!isOpen) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!badgeRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer, true)
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer, true)
  }, [isOpen])

  return (
    <Tooltip
      open={isOpen}
      onOpenChange={setOpen}
    >
      <TooltipTrigger
        asChild
        onClick={(event) => {
          event.preventDefault()
          setOpen(true)
        }}
      >
        <Badge
          ref={badgeRef}
          variant="secondary"
          tabIndex={0}
        >
          {source.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-full sm:max-w-xs">{source.tooltip}</TooltipContent>
    </Tooltip>
  )
}

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

  const addPreference = (id: string) => {
    if (!available.includes(id)) return
    const option = optionOf(id)
    setItems([...items, option ? { id, neutralValues: [...option.defaultNeutralValues] } : { id }])
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
    <Card padding="none">
      <CardContent>
        <div className="space-y-3 py-4">
          <fieldset className="space-y-2">
            <FieldLegend className="mb-0">Pořadí preferencí</FieldLegend>
            <FieldDescription>
              Přetažením určete prioritu. Výše uvedené preference mají přednost.
            </FieldDescription>
            {items.length ? (
              <ol className="space-y-1.5">
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
                      className={`rounded-md border border-border bg-muted/40 px-2 py-1.5 ${
                        draggedId === item.id ? "opacity-50" : ""
                      } ${insertionIndex === index ? "border-t-2 border-t-ring" : ""} ${
                        insertionIndex === items.length && index === items.length - 1
                          ? "border-b-2 border-b-ring"
                          : ""
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="flex shrink-0 items-start gap-1 self-start">
                          <ActionTooltip label="Přetažením změnit pořadí">
                            <Button
                              variant="ghost"
                              size="icon-xs"
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
                                } else if (
                                  keyboardItemId === item.id &&
                                  event.key === "ArrowDown"
                                ) {
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
                          </ActionTooltip>
                          <span className="mt-1 w-5 self-start text-right text-sm text-muted-foreground tabular-nums">
                            {index + 1}.
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 py-0.5">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="min-w-0 font-medium break-words">{label}</p>
                            <PreferenceSourceBadge
                              id={item.id}
                              wishes={wishes}
                            />
                          </div>
                          {option ? (
                            <div className="mt-0.5">
                              <AnswerSelectionDisclosure
                                id={`ignored-answers-${item.id}`}
                                title="Ignorované odpovědi"
                                summary={
                                  item.neutralValues?.length
                                    ? option.values
                                        .filter(({ value }) => item.neutralValues?.includes(value))
                                        .map(({ label: valueLabel }) => valueLabel)
                                        .join(" · ")
                                    : "Žádné"
                                }
                                options={option.values}
                                selectedValues={item.neutralValues ?? []}
                                explanation="Vybrané odpovědi ani prázdné odpovědi neovlivní návrh."
                                onSelectionChange={(value, isChecked) =>
                                  setNeutral(index, value, isChecked)
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0">
                          <ActionTooltip label="Odebrat preferenci">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Odebrat ${label}`}
                              onClick={() => setItems(items.filter((_, i) => i !== index))}
                            >
                              <X />
                            </Button>
                          </ActionTooltip>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Žádné preference nejsou přidané.</p>
              </div>
            )}
          </fieldset>
          {available.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Plus />
                  Přidat preferenci
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {available.map((id) => (
                  <DropdownMenuItem
                    key={id}
                    onSelect={() => addPreference(id)}
                  >
                    {preferenceLabel(id, wishes, labels)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
          <div className="flex justify-end">
            <PendingButton
              isPending={isSaving}
              // Nothing to save until the list differs from the saved one.
              disabled={samePreferences(items, preferences)}
              onClick={() => onSave?.(items)}
            >
              Uložit preference
            </PendingButton>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
