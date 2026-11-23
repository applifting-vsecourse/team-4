import { valuesOf } from '@/modules/accommodation/domain/attributes';
import {
  effectiveValue,
  HardAttribute,
  ManualValue,
} from '@/modules/accommodation/domain/effective-value';

// The organizer's determination of a participant's effective value (S3-01,
// spec v4 §4): it never changes or guesses the answer, holds for every term
// of the registration and lapses with any change of the answer.

/** At most this long (`accommodation_manual_value.reason`). */
export const REASON_MAX_LENGTH = 500;

/** The values a room can carry, so the values an organizer may determine. */
export const determiningValues = (hard: HardAttribute): string[] =>
  (hard.values ?? valuesOf(hard.attribute, [])).filter(
    (value) => !hard.nonDeterminingValues.includes(value),
  );

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
