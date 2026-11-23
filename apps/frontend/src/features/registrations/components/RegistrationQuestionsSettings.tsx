import { useEffect, useRef, useState } from "react"
import { ChevronDown, GripVertical, ListChecks, Plus, X } from "lucide-react"

import { ActionTooltip } from "@/components/ActionTooltip"
import { EmptyState } from "@/components/EmptyState"
import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import {
  MAX_OPTIONS,
  MAX_QUESTIONS,
  MIN_OPTIONS,
  type ManagedQuestion,
  type QuestionDraft,
} from "@/features/registrations/api/questionSchemas"

export type RegistrationQuestionsSettingsProps = {
  /** The saved questions in form order; the form starts on them. */
  questions: ManagedQuestion[]
  /** A failed save, already worded; the edits stay in the form. */
  saveError?: string
  onSave?: (questions: QuestionDraft[]) => void
  isSaving?: boolean
}

type DraftOption = { key: string; id?: string; label: string }
type Draft = {
  key: string
  id?: string
  label: string
  isRequired: boolean
  options: DraftOption[]
}
type InvalidField = {
  questionKey: string
  field: "label" | "option"
  optionKey?: string
  message: string
}

let nextKey = 0
const newKey = () => `new-${(nextKey += 1)}`

const toDrafts = (questions: ManagedQuestion[]): Draft[] =>
  questions.map((question) => ({
    key: question.id,
    id: question.id,
    label: question.label,
    isRequired: question.isRequired,
    options: question.options.map((option) => ({
      key: option.id,
      id: option.id,
      label: option.label,
    })),
  }))

const toSaved = (drafts: Draft[]): QuestionDraft[] =>
  drafts.map((draft) => ({
    ...(draft.id ? { id: draft.id } : {}),
    label: draft.label,
    isRequired: draft.isRequired,
    options: draft.options.map((option) => ({
      ...(option.id ? { id: option.id } : {}),
      label: option.label,
    })),
  }))

const USED_BY: Record<"hard" | "soft", string> = {
  hard: "Pokoje se podle ní dělí v Pravidlech ubytování",
  soft: "Návrh pokojů ji používá jako preferenci",
}

/** Why a question cannot be removed, or null when it can. */
const keptBecause = (saved: ManagedQuestion | undefined) =>
  saved?.usedBy
    ? `${USED_BY[saved.usedBy]}, proto ji nelze odebrat ani z ní odebrat možnost.`
    : saved?.isAnswered
      ? "Účastníci na ni už odpověděli, proto ji nelze odebrat. Zvolené možnosti zůstávají."
      : null

const blankQuestion = (): Draft => ({
  key: newKey(),
  label: "",
  isRequired: false,
  options: [
    { key: newKey(), label: "" },
    { key: newKey(), label: "" },
  ],
})

const moveItem = (items: Draft[], from: number, to: number) => {
  if (to < 0 || to >= items.length || from === to) return items
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

const validateDrafts = (drafts: Draft[]): InvalidField | null => {
  for (const draft of drafts) {
    const label = draft.label.trim()
    if (!label) {
      return { questionKey: draft.key, field: "label", message: "Vyplňte text otázky." }
    }
    if (draft.options.length < MIN_OPTIONS || draft.options.length > MAX_OPTIONS) {
      return {
        questionKey: draft.key,
        field: "option",
        optionKey: draft.options[0]?.key,
        message: `Otázka potřebuje ${MIN_OPTIONS}–${MAX_OPTIONS} možností odpovědi.`,
      }
    }
    const optionLabels = draft.options.map((option) => option.label.trim())
    const emptyIndex = optionLabels.findIndex((option) => !option)
    if (emptyIndex >= 0) {
      return {
        questionKey: draft.key,
        field: "option",
        optionKey: draft.options[emptyIndex]!.key,
        message: "Vyplňte všechny možnosti odpovědi.",
      }
    }
    const seen = new Set<string>()
    const duplicateIndex = optionLabels.findIndex((option) => {
      const normalized = option.toLocaleLowerCase("cs")
      if (seen.has(normalized)) return true
      seen.add(normalized)
      return false
    })
    if (duplicateIndex >= 0) {
      return {
        questionKey: draft.key,
        field: "option",
        optionKey: draft.options[duplicateIndex]!.key,
        message: "Možnosti odpovědi se opakují.",
      }
    }
  }
  return null
}

/** Správa akce → Nastavení → Otázky v přihlášce (#485). */
export function RegistrationQuestionsSettings({
  questions,
  saveError,
  onSave,
  isSaving = false,
}: RegistrationQuestionsSettingsProps) {
  const [drafts, setDrafts] = useState(() => toDrafts(questions))
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [invalid, setInvalid] = useState<InvalidField | null>(null)
  const [focusTarget, setFocusTarget] = useState<{
    questionKey: string
    optionKey?: string
  } | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const [draggedKey, setDraggedKey] = useState<string | null>(null)
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null)
  const [keyboardKey, setKeyboardKey] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const keyboardOriginal = useRef<Draft[] | null>(null)
  const labelRefs = useRef(new Map<string, HTMLInputElement>())
  const optionRefs = useRef(new Map<string, HTMLInputElement>())
  const isUnchanged =
    JSON.stringify(toSaved(drafts)) === JSON.stringify(toSaved(toDrafts(questions)))

  useEffect(() => {
    if (!focusRequest) return
    const input = focusTarget?.optionKey
      ? optionRefs.current.get(focusTarget.optionKey)
      : focusTarget
        ? labelRefs.current.get(focusTarget.questionKey)
        : null
    input?.focus()
  }, [expandedKey, focusRequest, focusTarget])

  useEffect(() => {
    if (keyboardKey) document.getElementById(`question-move-${keyboardKey}`)?.focus()
  }, [drafts, keyboardKey])

  const update = (key: string, change: (draft: Draft) => Draft) => {
    setDrafts((current) => current.map((draft) => (draft.key === key ? change(draft) : draft)))
    if (invalid?.questionKey === key) {
      setInvalid(null)
      setFocusTarget(null)
    }
  }
  const reorder = (from: number, to: number) => setDrafts((current) => moveItem(current, from, to))
  const announcePosition = (key: string, list: Draft[]) => {
    const index = list.findIndex((draft) => draft.key === key)
    const currentName = list[index]?.label.trim()
    const name = currentName === "" ? "Nová otázka" : (currentName ?? "Nová otázka")
    setAnnouncement(`${name}, pozice ${index + 1} z ${list.length}.`)
  }
  const startKeyboardMove = (key: string) => {
    keyboardOriginal.current = drafts
    setKeyboardKey(key)
    const index = drafts.findIndex((draft) => draft.key === key)
    setAnnouncement(
      `Otázka na pozici ${index + 1} z ${drafts.length}. Přesuňte šipkami, potvrďte mezerníkem nebo zrušte klávesou Escape.`,
    )
  }
  const finishKeyboardMove = () => {
    if (!keyboardKey) return
    announcePosition(keyboardKey, drafts)
    keyboardOriginal.current = null
    setKeyboardKey(null)
  }
  const cancelKeyboardMove = () => {
    if (!keyboardKey) return
    const original = keyboardOriginal.current ?? drafts
    setDrafts(original)
    setAnnouncement("Přesun otázky zrušen.")
    keyboardOriginal.current = null
    setKeyboardKey(null)
  }
  const dropAt = (key: string, to: number) => {
    const from = drafts.findIndex((draft) => draft.key === key)
    const bounded = Math.max(0, Math.min(to, drafts.length - 1))
    reorder(from, bounded)
    announcePosition(key, moveItem(drafts, from, bounded))
    setDraggedKey(null)
    setInsertionIndex(null)
  }
  const addQuestion = () => {
    const question = blankQuestion()
    setDrafts((current) => [...current, question])
    setExpandedKey(question.key)
    setInvalid(null)
    setFocusTarget({ questionKey: question.key })
    setFocusRequest((current) => current + 1)
  }
  const save = () => {
    const failure = validateDrafts(drafts)
    if (failure) {
      setInvalid(failure)
      setFocusTarget({
        questionKey: failure.questionKey,
        ...(failure.optionKey ? { optionKey: failure.optionKey } : {}),
      })
      setExpandedKey(failure.questionKey)
      setFocusRequest((current) => current + 1)
      return
    }
    setInvalid(null)
    onSave?.(toSaved(drafts))
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-3">
          {drafts.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Akce nemá vlastní otázky"
              description="Formulář se ptá jen na základní údaje a pohlaví."
            />
          ) : (
            <ol className="space-y-2">
              {drafts.map((draft, index) => {
                const saved = questions.find((question) => question.id === draft.id)
                const kept = keptBecause(saved)
                const isSplittingRooms = saved?.usedBy === "hard"
                const trimmedLabel = draft.label.trim()
                const label = trimmedLabel ? trimmedLabel : "Nová otázka"
                const isOpen = expandedKey === draft.key
                const optionsCount = `${draft.options.length} ${draft.options.length === 1 ? "možnost" : draft.options.length >= 2 && draft.options.length <= 4 ? "možnosti" : "možností"}`
                return (
                  <li
                    key={draft.key}
                    onDragOver={(event) => {
                      if (!draggedKey) return
                      event.preventDefault()
                      const rect = event.currentTarget.getBoundingClientRect()
                      const boundary = index + (event.clientY >= rect.top + rect.height / 2 ? 1 : 0)
                      setInsertionIndex(
                        boundary > drafts.findIndex((candidate) => candidate.key === draggedKey)
                          ? boundary - 1
                          : boundary,
                      )
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (draggedKey) dropAt(draggedKey, insertionIndex ?? index)
                    }}
                    className={`rounded-md border border-border bg-muted/30 ${draggedKey === draft.key ? "opacity-50" : ""} ${insertionIndex === index ? "border-t-2 border-t-ring" : ""} ${insertionIndex === drafts.length && index === drafts.length - 1 ? "border-b-2 border-b-ring" : ""}`}
                  >
                    <Collapsible
                      open={isOpen}
                      onOpenChange={(isOpen) => setExpandedKey(isOpen ? draft.key : null)}
                    >
                      <div className="flex min-w-0 items-center gap-1.5 px-1.5 py-1.5">
                        <ActionTooltip label="Přetažením změnit pořadí">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            id={`question-move-${draft.key}`}
                            aria-label={`Přesunout ${label}`}
                            aria-pressed={keyboardKey === draft.key}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move"
                              event.dataTransfer.setData("text/plain", draft.key)
                              setDraggedKey(draft.key)
                            }}
                            onDragEnd={() => {
                              setDraggedKey(null)
                              setInsertionIndex(null)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === " " || event.key === "Spacebar") {
                                event.preventDefault()
                                if (keyboardKey === draft.key) finishKeyboardMove()
                                else if (!keyboardKey) startKeyboardMove(draft.key)
                              } else if (keyboardKey === draft.key && event.key === "Escape") {
                                event.preventDefault()
                                cancelKeyboardMove()
                              } else if (keyboardKey === draft.key && event.key === "ArrowUp") {
                                event.preventDefault()
                                reorder(index, index - 1)
                              } else if (keyboardKey === draft.key && event.key === "ArrowDown") {
                                event.preventDefault()
                                reorder(index, index + 1)
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
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto min-h-9 min-w-0 flex-1 justify-start text-left"
                          >
                            <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {optionsCount}
                            </span>
                            {draft.isRequired || isSplittingRooms ? (
                              <Badge variant="secondary">Povinná</Badge>
                            ) : null}
                            <ChevronDown
                              aria-hidden
                              className={`size-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <ActionTooltip label="Odebrat otázku">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Odebrat ${label}`}
                            disabled={kept !== null}
                            onClick={() => {
                              setDrafts((current) =>
                                current.filter((item) => item.key !== draft.key),
                              )
                              if (expandedKey === draft.key) setExpandedKey(null)
                            }}
                          >
                            <X />
                          </Button>
                        </ActionTooltip>
                      </div>
                      <CollapsibleContent>
                        <div className="space-y-3 border-t border-border px-3 pt-2.5 pb-3">
                          <Field
                            data-invalid={
                              invalid?.questionKey === draft.key && invalid.field === "label"
                                ? true
                                : undefined
                            }
                          >
                            <FieldLabel htmlFor={`question-${draft.key}`}>Znění otázky</FieldLabel>
                            <Input
                              id={`question-${draft.key}`}
                              ref={(input) => {
                                if (input) labelRefs.current.set(draft.key, input)
                                else labelRefs.current.delete(draft.key)
                              }}
                              value={draft.label}
                              maxLength={200}
                              placeholder="Např. Jaké máte zkušenosti s turistikou?"
                              aria-invalid={
                                invalid?.questionKey === draft.key && invalid.field === "label"
                                  ? true
                                  : undefined
                              }
                              aria-describedby={
                                invalid?.questionKey === draft.key && invalid.field === "label"
                                  ? `question-${draft.key}-error`
                                  : undefined
                              }
                              onChange={(event) =>
                                update(draft.key, (question) => ({
                                  ...question,
                                  label: event.target.value,
                                }))
                              }
                            />
                            {invalid?.questionKey === draft.key && invalid.field === "label" ? (
                              <FieldError id={`question-${draft.key}-error`}>
                                {invalid.message}
                              </FieldError>
                            ) : null}
                          </Field>
                          {kept ? <p className="text-xs text-muted-foreground">{kept}</p> : null}
                          <Field orientation="horizontal">
                            <Checkbox
                              id={`required-${draft.key}`}
                              checked={draft.isRequired || isSplittingRooms}
                              disabled={isSplittingRooms}
                              aria-describedby={
                                isSplittingRooms ? `required-${draft.key}-reason` : undefined
                              }
                              onCheckedChange={(checked) =>
                                update(draft.key, (question) => ({
                                  ...question,
                                  isRequired: checked === true,
                                }))
                              }
                            />
                            <FieldContent>
                              <FieldLabel htmlFor={`required-${draft.key}`}>
                                Povinná odpověď
                              </FieldLabel>
                              {isSplittingRooms ? (
                                <FieldDescription id={`required-${draft.key}-reason`}>
                                  Povinná, dokud se podle ní dělí pokoje.
                                </FieldDescription>
                              ) : null}
                            </FieldContent>
                          </Field>
                          <FieldSet spacing="compact">
                            <FieldLegend
                              variant="label"
                              className="mb-0 flex items-baseline"
                            >
                              Možnosti odpovědi
                              <span className="ml-2 text-xs text-muted-foreground">
                                {MIN_OPTIONS}–{MAX_OPTIONS} možností
                              </span>
                            </FieldLegend>
                            <div className="space-y-2">
                              <ul className="space-y-1.5">
                                {draft.options.map((option, optionIndex) => {
                                  const isChosen =
                                    saved?.options.find((item) => item.id === option.id)
                                      ?.isChosen ?? false
                                  const canRemove =
                                    !saved?.usedBy &&
                                    !isChosen &&
                                    draft.options.length > MIN_OPTIONS
                                  const isOptionInvalid =
                                    invalid?.questionKey === draft.key &&
                                    invalid.field === "option" &&
                                    invalid.optionKey === option.key
                                  return (
                                    <li
                                      key={option.key}
                                      className="flex items-center gap-2"
                                    >
                                      <div className="w-24 shrink-0">
                                        <FieldLabel htmlFor={`option-${option.key}`}>
                                          Možnost {optionIndex + 1}
                                        </FieldLabel>
                                      </div>
                                      <Input
                                        id={`option-${option.key}`}
                                        ref={(input) => {
                                          if (input) optionRefs.current.set(option.key, input)
                                          else optionRefs.current.delete(option.key)
                                        }}
                                        value={option.label}
                                        maxLength={100}
                                        placeholder={
                                          optionIndex === 0
                                            ? "Např. Začátečník"
                                            : optionIndex === 1
                                              ? "Např. Pokročilý"
                                              : "Zadejte odpověď"
                                        }
                                        aria-invalid={isOptionInvalid ? true : undefined}
                                        aria-describedby={
                                          isOptionInvalid
                                            ? `question-${draft.key}-option-error`
                                            : undefined
                                        }
                                        onChange={(event) =>
                                          update(draft.key, (question) => ({
                                            ...question,
                                            options: question.options.map((item) =>
                                              item.key === option.key
                                                ? { ...item, label: event.target.value }
                                                : item,
                                            ),
                                          }))
                                        }
                                      />
                                      {isChosen ? (
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                          Zvolená
                                        </span>
                                      ) : null}
                                      <ActionTooltip label="Odebrat možnost">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-xs"
                                          aria-label={`Odebrat možnost ${optionIndex + 1}`}
                                          disabled={!canRemove}
                                          onClick={() =>
                                            update(draft.key, (question) => ({
                                              ...question,
                                              options: question.options.filter(
                                                (item) => item.key !== option.key,
                                              ),
                                            }))
                                          }
                                        >
                                          <X />
                                        </Button>
                                      </ActionTooltip>
                                    </li>
                                  )
                                })}
                              </ul>
                              {invalid?.questionKey === draft.key && invalid.field === "option" ? (
                                <FieldError id={`question-${draft.key}-option-error`}>
                                  {invalid.message}
                                </FieldError>
                              ) : null}
                              {draft.options.length < MAX_OPTIONS ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="self-start"
                                  onClick={() =>
                                    update(draft.key, (question) => ({
                                      ...question,
                                      options: [...question.options, { key: newKey(), label: "" }],
                                    }))
                                  }
                                >
                                  <Plus />
                                  Přidat možnost
                                </Button>
                              ) : null}
                            </div>
                          </FieldSet>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                )
              })}
            </ol>
          )}
          {drafts.length < MAX_QUESTIONS ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addQuestion}
            >
              <Plus />
              Přidat otázku
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Akce může mít nejvýš {MAX_QUESTIONS} vlastních otázek.
            </p>
          )}
          <span
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            {announcement}
          </span>
          {saveError ? (
            <FormError
              title="Otázky se nepodařilo uložit"
              message={saveError}
            />
          ) : null}
          {invalid ? (
            <FormError
              title="Otázky obsahují chybu"
              message="Zkontrolujte označené pole."
            />
          ) : null}
          <div className="flex justify-end">
            <PendingButton
              isPending={isSaving}
              disabled={isUnchanged}
              onClick={save}
            >
              Uložit otázky
            </PendingButton>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
