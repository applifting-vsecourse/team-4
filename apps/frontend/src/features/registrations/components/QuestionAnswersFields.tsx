import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { FormQuestion } from "@/features/registrations/api/questionSchemas"

/** The radio value of "no answer" to an optional question. */
const NO_ANSWER = ""

/** Chosen option by question id; null or missing is no answer. */
export type AnswerValues = Record<string, string | null>

export type QuestionAnswersFieldsProps = {
  /** The event's questions, in form order. */
  questions: FormQuestion[]
  value: AnswerValues
  onChange: (value: AnswerValues) => void
  /** A message by question id, shown at its options. */
  errors?: Partial<Record<string, string>>
  /** Prefix of the field ids, unique on the page. */
  idPrefix: string
}

// The organizer's categorical questions (#485): one option each. A required
// question is marked; an optional one can be left unanswered ("Neuvádím").
export function QuestionAnswersFields({
  questions,
  value,
  onChange,
  errors = {},
  idPrefix,
}: QuestionAnswersFieldsProps) {
  return (
    <div className="space-y-6">
      {questions.map((question) => {
        const error = errors[question.id]
        const errorId = `${idPrefix}-${question.id}-error`
        const choices = question.isRequired
          ? question.options
          : [...question.options, { id: NO_ANSWER, label: "Neuvádím" }]
        return (
          <FieldSet
            key={question.id}
            data-invalid={error ? true : undefined}
          >
            <FieldLegend variant="label">
              {question.label}
              {question.isRequired ? (
                <span
                  aria-hidden="true"
                  className="text-destructive"
                >
                  {" "}
                  *
                </span>
              ) : null}
            </FieldLegend>
            <RadioGroup
              value={value[question.id] ?? (question.isRequired ? "" : NO_ANSWER)}
              onValueChange={(next) =>
                onChange({ ...value, [question.id]: next === NO_ANSWER ? null : next })
              }
              aria-required={question.isRequired || undefined}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
            >
              {choices.map((option) => {
                const id = `${idPrefix}-${question.id}-${option.id || "none"}`
                return (
                  <Field
                    key={option.id || "none"}
                    orientation="horizontal"
                  >
                    <RadioGroupItem
                      id={id}
                      value={option.id}
                    />
                    <FieldLabel htmlFor={id}>{option.label}</FieldLabel>
                  </Field>
                )
              })}
            </RadioGroup>
            {error ? <FieldError id={errorId}>{error}</FieldError> : null}
          </FieldSet>
        )
      })}
    </div>
  )
}

/** The answers to send: only to the given questions, unanswered ones left out. */
export const answersOf = (questions: FormQuestion[], value: AnswerValues) =>
  questions.flatMap((question) => {
    const optionId = value[question.id]
    return optionId && question.options.some((option) => option.id === optionId)
      ? [{ questionId: question.id, optionId }]
      : []
  })

/** The required questions without an answer of their own options. */
export const missingAnswers = (questions: FormQuestion[], value: AnswerValues) =>
  questions.filter(
    (question) =>
      question.isRequired && !question.options.some((option) => option.id === value[question.id]),
  )
