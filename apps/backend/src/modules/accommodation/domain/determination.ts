import {
  effectiveValue,
  HardAttribute,
  ManualValue,
} from '@/modules/accommodation/domain/effective-value';

// The organizer's determination of a participant's effective value (S3-01,
// spec v4 §4): it never changes or guesses the answer, holds for every term
// of the registration and lapses with any change of the answer.

/** The hard attribute answered by the F64 gender question (spec v4 §11). */
export const GENDER_ATTRIBUTE = 'gender';

/** The answers of the gender question; the non-determining ones come from the rules. */
const GENDER_VALUES = ['female', 'male', 'other', 'undisclosed'] as const;

/** At most this long (`accommodation_manual_value.reason`). */
export const REASON_MAX_LENGTH = 500;

/**
 * The participant's answer to the hard attribute. Only the gender question
 * (F64) stores answers yet; any other attribute is unanswered until the
 * categorical-questions story stores them.
 */
export const answerOf = (
  attribute: string,
  registration: { gender: string | null },
): string | null =>
  attribute === GENDER_ATTRIBUTE ? registration.gender : null;

/** The values a room can carry, so the values an organizer may determine. */
export const determiningValues = (hard: HardAttribute): string[] =>
  hard.attribute === GENDER_ATTRIBUTE
    ? GENDER_VALUES.filter(
        (value) => !hard.nonDeterminingValues.includes(value),
      )
    : [];

/** The F64 notice: with a hard attribute and no effective value, the organizer decides. */
export const needsDetermination = (
  hard: HardAttribute | null,
  answer: string | null,
  manual: ManualValue | null,
): boolean => hard !== null && effectiveValue(hard, answer, manual) === null;

export type DeterminationRefusal =
  /** The event has no hard attribute: nobody needs a determination. */
  | 'no_hard_attribute'
  /** The answer already determines the room. */
  | 'determination_not_needed'
  | 'value_invalid';

/**
 * Whether the organizer may determine `value` for this answer. A valid
 * determination may be replaced; a determining answer needs none.
 */
export function refuseDetermination(
  hard: HardAttribute | null,
  answer: string | null,
  value: string,
): DeterminationRefusal | null {
  if (!hard) return 'no_hard_attribute';
  if (effectiveValue(hard, answer, null) !== null) {
    return 'determination_not_needed';
  }
  if (!determiningValues(hard).includes(value)) return 'value_invalid';
  return null;
}
