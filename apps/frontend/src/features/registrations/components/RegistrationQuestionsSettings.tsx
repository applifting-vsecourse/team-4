import { useState } from "react"
import { ArrowDown, ArrowUp, ListChecks, Plus, X } from "lucide-react"

import { EmptyState } from "@/components/EmptyState"
import { FormError } from "@/components/FormError"
import { PendingButton } from "@/components/PendingButton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
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

// A draft holds only what the organizer edits; whether a question is answered,
// an option chosen or a question used by the rules comes from the current
// questions on every render, so a reload refreshes it without losing edits.
type DraftOption = { key: string; id?: string; label: string }
type Draft = {
  key: string
  id?: string
  label: string
  isRequired: boolean
  options: DraftOption[]
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

// Správa akce → Nastavení → Otázky v přihlášce (#485): the organizer's own
// categorical questions of the registration form, each with 2–10 options.
// An answered question or chosen option stays; renaming always works, so the
// answers given keep their meaning. Design only: every value is passed in.
export function RegistrationQuestionsSettings({
  questions,
  saveError,
  onSave,
  isSaving = false,
}: RegistrationQuestionsSettingsProps) {
  const [drafts, setDrafts] = useState(() => toDrafts(questions))
  const isUnchanged =
    JSON.stringify(toSaved(drafts)) === JSON.stringify(toSaved(toDrafts(questions)))

  const update = (key: string, change: (draft: Draft) => Draft) =>
    setDrafts((current) => current.map((draft) => (draft.key === key ? change(draft) : draft)))
  const move = (from: number, to: number) =>
    setDrafts((current) => {
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item!)
      return next
    })
  const addQuestion = () => setDrafts((current) => [...current, blankQuestion()])

  if (drafts.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={ListChecks}
            title="Akce nemá vlastní otázky"
            description="Formulář se ptá jen na základní údaje a pohlaví."
            action={
              <Button
                variant="outline"
                onClick={addQuestion}
              >
                <Plus />
                Přidat otázku
              </Button>
            }
          />
          {saveError ? (
            <FormError
              title="Otázky se nepodařilo uložit"
              message={saveError}
            />
          ) : null}
        </CardContent>
        {!isUnchanged ? (
          <CardFooter className="justify-end">
            <PendingButton
              isPending={isSaving}
              onClick={() => onSave?.([])}
            >
              Uložit
            </PendingButton>
          </CardFooter>
        ) : null}
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-6">
          <ol className="divide-y divide-border">
            {drafts.map((draft, index) => {
              const name = draft.label.trim() || `Otázka ${index + 1}`
              const saved = questions.find((question) => question.id === draft.id)
              const kept = keptBecause(saved)
              const canRemoveOptions = !saved?.usedBy
              const isSplittingRooms = saved?.usedBy === "hard"
              return (
                <li
                  key={draft.key}
                  className="space-y-4 py-4 first:pt-0"
                >
                  <div className="flex items-end gap-3">
                    <Field className="min-w-0 flex-1">
                      <FieldLabel htmlFor={`question-${draft.key}`}>Otázka {index + 1}</FieldLabel>
                      <Input
                        id={`question-${draft.key}`}
                        value={draft.label}
                        maxLength={200}
                        onChange={(event) =>
                          update(draft.key, (d) => ({ ...d, label: event.target.value }))
                        }
                      />
                    </Field>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Posunout ${name} výš`}
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Posunout ${name} níž`}
                        disabled={index === drafts.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Odebrat ${name}`}
                        disabled={kept !== null}
                        onClick={() =>
                          setDrafts((current) => current.filter((d) => d.key !== draft.key))
                        }
                      >
                        <X />
                      </Button>
                    </div>
                  </div>
                  {kept ? <p className="text-sm text-muted-foreground">{kept}</p> : null}
                  <Field orientation="horizontal">
                    <Checkbox
                      id={`required-${draft.key}`}
                      // Rooms are split by it: required while they are (PO feedback).
                      checked={draft.isRequired || isSplittingRooms}
                      disabled={isSplittingRooms}
                      aria-describedby={
                        isSplittingRooms ? `required-${draft.key}-reason` : undefined
                      }
                      onCheckedChange={(checked) =>
                        update(draft.key, (d) => ({ ...d, isRequired: checked === true }))
                      }
                    />
                    <FieldContent>
                      <FieldLabel htmlFor={`required-${draft.key}`}>Povinná odpověď</FieldLabel>
                      {isSplittingRooms ? (
                        <FieldDescription id={`required-${draft.key}-reason`}>
                          Povinná, dokud se podle ní dělí pokoje.
                        </FieldDescription>
                      ) : null}
                    </FieldContent>
                  </Field>
                  <FieldSet>
                    <FieldLegend variant="label">Možnosti odpovědi: {name}</FieldLegend>
                    <FieldDescription>
                      {MIN_OPTIONS}–{MAX_OPTIONS} možností.
                    </FieldDescription>
                    <ul className="space-y-2">
                      {draft.options.map((option, optionIndex) => {
                        const optionName = option.label.trim() || `Možnost ${optionIndex + 1}`
                        const isChosen =
                          saved?.options.find((o) => o.id === option.id)?.isChosen ?? false
                        const canRemove =
                          canRemoveOptions && !isChosen && draft.options.length > MIN_OPTIONS
                        return (
                          <li
                            key={option.key}
                            className="flex items-center gap-2"
                          >
                            <Input
                              aria-label={`${name}, možnost ${optionIndex + 1}`}
                              value={option.label}
                              maxLength={100}
                              onChange={(event) =>
                                update(draft.key, (d) => ({
                                  ...d,
                                  options: d.options.map((o) =>
                                    o.key === option.key ? { ...o, label: event.target.value } : o,
                                  ),
                                }))
                              }
                            />
                            {isChosen ? (
                              <span className="shrink-0 text-sm text-muted-foreground">
                                Zvolená
                              </span>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Odebrat ${optionName}`}
                              disabled={!canRemove}
                              onClick={() =>
                                update(draft.key, (d) => ({
                                  ...d,
                                  options: d.options.filter((o) => o.key !== option.key),
                                }))
                              }
                            >
                              <X />
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                    {draft.options.length < MAX_OPTIONS ? (
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            update(draft.key, (d) => ({
                              ...d,
                              options: [...d.options, { key: newKey(), label: "" }],
                            }))
                          }
                        >
                          <Plus />
                          Přidat možnost
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Otázka má nejvýš {MAX_OPTIONS} možností.
                      </p>
                    )}
                  </FieldSet>
                </li>
              )
            })}
          </ol>
          {drafts.length < MAX_QUESTIONS ? (
            <Button
              variant="outline"
              onClick={addQuestion}
            >
              <Plus />
              Přidat otázku
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Akce může mít nejvýš {MAX_QUESTIONS} vlastních otázek.
            </p>
          )}
          {saveError ? (
            <FormError
              title="Otázky se nepodařilo uložit"
              message={saveError}
            />
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <PendingButton
          isPending={isSaving}
          // Nothing to save until the list differs from the saved one.
          disabled={isUnchanged}
          onClick={() => onSave?.(toSaved(drafts))}
        >
          Uložit
        </PendingButton>
      </CardFooter>
    </Card>
  )
}
