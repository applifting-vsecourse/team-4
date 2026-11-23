import { z } from "zod"

// Categorical questions of an event's registration form (#485): up to five,
// each with 2–10 options and one answer per registration. A question can be
// the hard attribute or a soft preference of the accommodation rules.

export const MAX_QUESTIONS = 5
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 10

const optionSchema = z.object({ id: z.string().uuid(), label: z.string() })

/** A question as the registration form asks it. */
export const formQuestionSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  isRequired: z.boolean(),
  options: z.array(optionSchema),
})
export type FormQuestion = z.infer<typeof formQuestionSchema>

/** A participant's answer: one option of one question. */
export const answerSchema = z.object({
  questionId: z.string().uuid(),
  optionId: z.string().uuid(),
})
export type Answer = z.infer<typeof answerSchema>

/** A question with the answer given, as the organizer's detail shows it. */
export const answerViewSchema = z.object({
  questionId: z.string().uuid(),
  question: z.string(),
  isRequired: z.boolean(),
  optionId: z.string().uuid().nullable(),
  option: z.string().nullable(),
})
export type AnswerView = z.infer<typeof answerViewSchema>

/** A question in Nastavení, with what keeps it from being removed. */
export const managedQuestionSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  isRequired: z.boolean(),
  isAnswered: z.boolean(),
  usedBy: z.enum(["hard", "soft"]).nullable(),
  options: z.array(optionSchema.extend({ isChosen: z.boolean() })),
})
export type ManagedQuestion = z.infer<typeof managedQuestionSchema>

export const eventQuestionsSchema = z.object({ questions: z.array(managedQuestionSchema) })

/** One question as the organizer saves it; an id keeps an existing one. */
export type QuestionDraft = {
  id?: string
  label: string
  isRequired: boolean
  options: { id?: string; label: string }[]
}
