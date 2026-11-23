import { DefinitionList, DefinitionRow } from "@/components/DefinitionList"

/** A question of the organizer and the option chosen; null is no answer. */
export type AnsweredQuestion = { questionId: string; question: string; option: string | null }

// The answers to the organizer's questions (#485) on a detail page: each
// question in form order with the chosen option, or "Neuvedeno".
export function QuestionAnswersList({ answers }: { answers: AnsweredQuestion[] }) {
  return (
    <DefinitionList>
      {answers.map((answer) => (
        <DefinitionRow
          key={answer.questionId}
          label={answer.question}
        >
          {answer.option ?? "Neuvedeno"}
        </DefinitionRow>
      ))}
    </DefinitionList>
  )
}
