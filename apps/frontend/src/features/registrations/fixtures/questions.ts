import {
  eventQuestionsSchema,
  formQuestionSchema,
  type Answer,
  type FormQuestion,
  type ManagedQuestion,
} from "@/features/registrations/api/questionSchemas"

// The organizer's categorical questions (#485), parsed with the API schemas.

const uuid = (n: number) => `0190c0de-0000-7000-8000-${String(n).padStart(12, "0")}`

/** A required question; its ids match the accommodation fixtures' `SCHOOL_ATTRIBUTE`. */
export const SCHOOL: FormQuestion = formQuestionSchema.parse({
  id: "0190c0de-0000-7000-8000-000000000485",
  label: "Škola",
  isRequired: true,
  options: [
    { id: "0190c0de-0000-7000-8000-000000004851", label: "ZŠ Lipová" },
    { id: "0190c0de-0000-7000-8000-000000004852", label: "ZŠ Dubová" },
    { id: "0190c0de-0000-7000-8000-000000004853", label: "Jiná škola" },
  ],
})

/** An optional question. */
export const TROOP: FormQuestion = formQuestionSchema.parse({
  id: uuid(4860),
  label: "Oddíl",
  isRequired: false,
  options: [
    { id: uuid(4861), label: "Lišky" },
    { id: uuid(4862), label: "Vlci" },
  ],
})

/** The questions and answers of the participant's own registration detail. */
export type OwnQuestions = {
  questions: FormQuestion[]
  questionsVersion: string
  isGenderRequired: boolean
  answers: Answer[]
  missingAnswers: string[]
}

export const NO_QUESTIONS: OwnQuestions = {
  questions: [],
  questionsVersion: "q-none",
  isGenderRequired: false,
  answers: [],
  missingAnswers: [],
}

/** Both questions answered. */
export const ANSWERED: OwnQuestions = {
  questions: [SCHOOL, TROOP],
  questionsVersion: "q-school-troop",
  isGenderRequired: false,
  answers: [
    { questionId: SCHOOL.id, optionId: SCHOOL.options[1]!.id },
    { questionId: TROOP.id, optionId: TROOP.options[0]!.id },
  ],
  missingAnswers: [],
}

/** The required question was added after the registration. */
export const MISSING_REQUIRED: OwnQuestions = {
  questions: [SCHOOL, TROOP],
  questionsVersion: "q-school-troop",
  isGenderRequired: false,
  answers: [],
  missingAnswers: [SCHOOL.id],
}

/** The questions in Nastavení: the school one answered and used as the hard attribute. */
export const MANAGED_QUESTIONS: ManagedQuestion[] = eventQuestionsSchema.parse({
  questions: [
    {
      ...SCHOOL,
      isAnswered: true,
      usedBy: "hard",
      options: SCHOOL.options.map((option, index) => ({ ...option, isChosen: index < 2 })),
    },
    {
      ...TROOP,
      isAnswered: false,
      usedBy: null,
      options: TROOP.options.map((option) => ({ ...option, isChosen: false })),
    },
  ],
}).questions
