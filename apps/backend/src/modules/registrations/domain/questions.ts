// Categorical questions of an event's registration form (#485): up to five,
// each with 2–10 options and at most one answer per registration. The rules
// of the accommodation may use a question as the hard attribute or a soft
// preference; its id is the attribute and its option ids are the values.

import { createHash } from 'node:crypto';
import { GENDER_ATTRIBUTE } from '@/modules/accommodation/domain/attributes';

export const MAX_QUESTIONS = 5;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;
export const QUESTION_LABEL_MAX = 200;
export const OPTION_LABEL_MAX = 100;

export type QuestionOption = { id: string; label: string };

/** A question of the form, its options in the order of the form. */
export type Question = {
  id: string;
  label: string;
  isRequired: boolean;
  options: QuestionOption[];
};

/**
 * The form as participants answer it: the question that splits rooms is
 * required while it does, gender too (PO feedback on #485). "Nechci uvést"
 * stays a valid gender answer; it decides no room.
 */
export type RegistrationForm = {
  questions: Question[];
  isGenderRequired: boolean;
};

export const formOf = (
  questions: readonly Question[],
  hardAttribute: string | null | undefined,
): RegistrationForm => ({
  questions: questions.map((question) =>
    question.id === hardAttribute
      ? { ...question, isRequired: true }
      : question,
  ),
  isGenderRequired: hardAttribute === GENDER_ATTRIBUTE,
});

/** A participant's answer: one option of one question. */
export type Answer = { questionId: string; optionId: string };

/** A question with the participant's answer, as the detail pages show it. */
export type AnswerView = {
  questionId: string;
  question: string;
  isRequired: boolean;
  /** Null when not answered. */
  optionId: string | null;
  option: string | null;
};

/** Every question of the event in form order, with the answer given or none. */
export const answersView = (
  questions: readonly Question[],
  answers: readonly Answer[],
): AnswerView[] =>
  questions.map((question) => {
    const chosen = answers.find((a) => a.questionId === question.id);
    const option = question.options.find((o) => o.id === chosen?.optionId);
    return {
      questionId: question.id,
      question: question.label,
      isRequired: question.isRequired,
      optionId: option?.id ?? null,
      option: option?.label ?? null,
    };
  });

/** The required questions without an answer. */
export const missingRequired = (
  questions: readonly Question[],
  answers: readonly Answer[],
): Question[] =>
  questions.filter(
    (question) =>
      question.isRequired &&
      !answers.some((answer) => answer.questionId === question.id),
  );

export type AnswerError =
  /** An answer names a question or option the form no longer has. */
  | 'questions_changed'
  /** A question is answered twice. */
  | 'answer_invalid'
  /** A required question has no answer. */
  | 'answer_required'
  /** Rooms are split by gender, so it needs an answer ("Nechci uvést" counts). */
  | 'gender_required';

export const ANSWER_MESSAGES: Record<AnswerError, string> = {
  questions_changed:
    'Otázky přihlášky se mezitím změnily. Zkontrolujte odpovědi a odešlete je znovu.',
  answer_invalid: 'Na každou otázku lze odpovědět jen jednou.',
  answer_required: 'Odpovězte na povinné otázky.',
  gender_required:
    'Vyberte pohlaví pro ubytování. Pokud ho nechcete uvádět, zvolte „Nechci uvést“.',
};

/**
 * The version of the questions as a form shows them: their order, labels,
 * required flags and options. A form sends back the version it showed, so
 * any change made meanwhile, a rename or an added question too, asks the
 * participant again instead of saving answers to other questions (#485).
 */
export const questionsVersion = (form: RegistrationForm): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        form.isGenderRequired,
        form.questions.map((q) => [
          q.id,
          q.label,
          q.isRequired,
          q.options.map((o) => [o.id, o.label]),
        ]),
      ]),
    )
    .digest('hex')
    .slice(0, 16);

/**
 * Why the answers cannot be saved against the current questions, or null.
 * `version` is the one the form showed; left out, only the answers count.
 */
export function invalidAnswers(
  form: RegistrationForm,
  answers: readonly Answer[],
  version?: string,
  gender?: string | null,
): AnswerError | null {
  const { questions } = form;
  if (version !== undefined && version !== questionsVersion(form))
    return 'questions_changed';
  if (form.isGenderRequired && (gender ?? null) === null)
    return 'gender_required';
  const ids = answers.map((answer) => answer.questionId);
  if (new Set(ids).size !== ids.length) return 'answer_invalid';
  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question?.options.some((o) => o.id === answer.optionId))
      return 'questions_changed';
  }
  return missingRequired(questions, answers).length > 0
    ? 'answer_required'
    : null;
}

// ─── The organizer's save ─────────────────────────────────────────────────

/** One question as the organizer saves it; an id keeps an existing one. */
export type QuestionDraft = {
  id?: string;
  label: string;
  isRequired: boolean;
  options: { id?: string; label: string }[];
};

/** What protects questions from removal (#485). */
export type QuestionUsage = {
  answeredQuestionIds: ReadonlySet<string>;
  chosenOptionIds: ReadonlySet<string>;
  /** The questions the accommodation rules use, with how. */
  usedBy: ReadonlyMap<string, 'hard' | 'soft'>;
};

export type QuestionsErrorCode =
  | 'questions_changed'
  | 'questions_invalid'
  | 'question_answered'
  | 'option_chosen'
  | 'question_in_use';

export type QuestionsError = { code: QuestionsErrorCode; message: string };

/** What the save does, in form order. */
export type QuestionsPlan = {
  removedQuestionIds: string[];
  removedOptionIds: string[];
  questions: {
    id?: string;
    label: string;
    isRequired: boolean;
    options: { id?: string; label: string }[];
  }[];
};

const USED_BY: Record<'hard' | 'soft', string> = {
  hard: 'tvrdý atribut v Pravidlech ubytování',
  soft: 'měkká preference v Návrhu pokojů',
};

/**
 * Checks the organizer's list against the current questions and what they
 * are used for: at most five questions with 2–10 options each; an answered
 * question and a chosen option stay; a question the accommodation rules use
 * keeps every option. Renaming and adding are always allowed. Pure.
 */
export function planQuestions(
  current: readonly Question[],
  drafts: readonly QuestionDraft[],
  usage: QuestionUsage,
): QuestionsPlan | QuestionsError {
  const invalid = (message: string): QuestionsError => ({
    code: 'questions_invalid',
    message,
  });
  if (drafts.length > MAX_QUESTIONS)
    return invalid(`Akce může mít nejvýš ${MAX_QUESTIONS} vlastních otázek.`);
  const questions: QuestionsPlan['questions'] = [];
  const kept = new Set<string>();
  for (const draft of drafts) {
    const label = draft.label.trim();
    if (!label || label.length > QUESTION_LABEL_MAX)
      return invalid('Vyplňte text každé otázky.');
    const options = draft.options.map((option) => ({
      ...(option.id ? { id: option.id } : {}),
      label: option.label.trim(),
    }));
    if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS)
      return invalid(
        `Otázka „${label}“ potřebuje ${MIN_OPTIONS}–${MAX_OPTIONS} možností odpovědi.`,
      );
    if (options.some((o) => !o.label || o.label.length > OPTION_LABEL_MAX))
      return invalid(`Vyplňte všechny možnosti otázky „${label}“.`);
    const labels = options.map((o) => o.label.toLocaleLowerCase('cs'));
    if (new Set(labels).size !== labels.length)
      return invalid(`Možnosti otázky „${label}“ se opakují.`);
    const existing = draft.id
      ? current.find((question) => question.id === draft.id)
      : undefined;
    if (draft.id && (!existing || kept.has(draft.id)))
      return {
        code: 'questions_changed',
        message: 'Otázky se mezitím změnily. Načtěte je znovu.',
      };
    if (
      options.some(
        (o) => o.id && !existing?.options.some((e) => e.id === o.id),
      ) ||
      new Set(options.flatMap((o) => (o.id ? [o.id] : []))).size !==
        options.filter((o) => o.id).length
    )
      return {
        code: 'questions_changed',
        message: 'Otázky se mezitím změnily. Načtěte je znovu.',
      };
    if (existing) kept.add(existing.id);
    questions.push({
      ...(draft.id ? { id: draft.id } : {}),
      label,
      isRequired: draft.isRequired,
      options,
    });
  }

  const removedQuestions = current.filter((q) => !kept.has(q.id));
  for (const question of removedQuestions) {
    const use = usage.usedBy.get(question.id);
    if (use)
      return {
        code: 'question_in_use',
        message: `Otázku „${question.label}“ nelze odebrat: je to ${USED_BY[use]}.`,
      };
    if (usage.answeredQuestionIds.has(question.id))
      return {
        code: 'question_answered',
        message: `Otázku „${question.label}“ nelze odebrat: účastníci na ni už odpověděli.`,
      };
  }
  const removedOptionIds: string[] = [];
  for (const draft of questions) {
    if (!draft.id) continue;
    const existing = current.find((q) => q.id === draft.id)!;
    for (const option of existing.options) {
      if (draft.options.some((o) => o.id === option.id)) continue;
      const use = usage.usedBy.get(existing.id);
      if (use)
        return {
          code: 'question_in_use',
          message: `Z otázky „${existing.label}“ nelze odebrat možnost: je to ${USED_BY[use]}.`,
        };
      if (usage.chosenOptionIds.has(option.id))
        return {
          code: 'option_chosen',
          message: `Možnost „${option.label}“ nelze odebrat: někteří účastníci ji zvolili.`,
        };
      removedOptionIds.push(option.id);
    }
  }
  return {
    removedQuestionIds: removedQuestions.map((q) => q.id),
    removedOptionIds,
    questions,
  };
}
