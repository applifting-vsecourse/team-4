import { HardAttribute } from '@/modules/accommodation/domain/effective-value';

// The categorical questions an event's accommodation rules can use (#181,
// #384, #389, #485): the built-in gender question (F64) and the event's own
// questions of the registration form. A question's id is the attribute and
// its option ids are the values; gender keeps its fixed codes.

/** The hard attribute answered by the F64 gender question (spec v4 §11). */
export const GENDER_ATTRIBUTE = 'gender';

export type AttributeValue = { value: string; label: string };

/** A categorical question as the accommodation rules see it. */
export type EventAttribute = {
  attribute: string;
  label: string;
  /** Every answer, in the order of the form. */
  values: AttributeValue[];
  /** Answers that leave the room to the organizer when it is first chosen as the hard attribute. */
  defaultNonDetermining: string[];
  /** Answers offered as neutral when it is first added to the soft preferences. */
  defaultNeutral: string[];
};

/** The answers of the gender question, worded as the registration form words them. */
export const GENDER_VALUES: readonly AttributeValue[] = [
  { value: 'female', label: 'Žena' },
  { value: 'male', label: 'Muž' },
  { value: 'other', label: 'Jiná odpověď' },
  { value: 'undisclosed', label: 'Nechci uvést' },
];

/** The built-in gender question; "Jiná odpověď" and "Nechci uvést" decide no room by default. */
export const GENDER: EventAttribute = {
  attribute: GENDER_ATTRIBUTE,
  label: 'Pohlaví',
  values: [...GENDER_VALUES],
  defaultNonDetermining: ['other', 'undisclosed'],
  defaultNeutral: ['other', 'undisclosed'],
};

/** An event's question as the accommodation rules read it. */
export type QuestionAttributeSource = {
  id: string;
  label: string;
  /** In the order of the form. */
  options: { id: string; label: string }[];
};

/** Gender, then the event's questions in the order of the form. A new question has no default answers (#485). */
export const eventAttributes = (
  questions: readonly QuestionAttributeSource[],
): EventAttribute[] => [
  GENDER,
  ...questions.map((question) => ({
    attribute: question.id,
    label: question.label,
    values: question.options.map((option) => ({
      value: option.id,
      label: option.label,
    })),
    defaultNonDetermining: [],
    defaultNeutral: [],
  })),
];

/** Every answer of an attribute; gender's codes when only the attribute is known. */
export const valuesOf = (
  attribute: string,
  questions: readonly QuestionAttributeSource[],
): string[] =>
  attribute === GENDER_ATTRIBUTE
    ? GENDER_VALUES.map((value) => value.value)
    : (questions
        .find((question) => question.id === attribute)
        ?.options.map((option) => option.id) ?? []);

/** What a query selects of an event's questions for `valuesOf` and `eventAttributes`. */
export const questionAttributesSelect = {
  select: {
    id: true,
    label: true,
    options: {
      select: { id: true, label: true },
      orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
    },
  },
  orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
};

/**
 * A participant's answer to an attribute: the gender answer (F64) or the
 * chosen option of a question; null when not answered.
 */
export const answerOf = (
  attribute: string,
  registration: {
    gender: string | null;
    answers?: readonly { questionId: string; optionId: string }[];
  },
): string | null =>
  attribute === GENDER_ATTRIBUTE
    ? registration.gender
    : (registration.answers?.find((answer) => answer.questionId === attribute)
        ?.optionId ?? null);

/** What a query selects of a registration's answers for `answerOf`. */
export const answersSelect = {
  select: { questionId: true, optionId: true },
};

/** The event's hard attribute from its rules and questions; null when rooms are not split. */
export const hardAttributeFrom = (
  rules: {
    hardAttribute: string | null;
    nonDeterminingValues: readonly string[];
  } | null,
  questions: readonly QuestionAttributeSource[],
): HardAttribute | null =>
  rules?.hardAttribute
    ? {
        attribute: rules.hardAttribute,
        nonDeterminingValues: [...rules.nonDeterminingValues],
        values: valuesOf(rules.hardAttribute, questions),
      }
    : null;
