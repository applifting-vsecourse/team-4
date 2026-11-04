/**
 * The participant's voluntary answer for accommodation (F64): "Žena", "Muž",
 * "Jiná odpověď" or "Nechci uvést". It belongs to one registration, not to the
 * sign-in account. No answer (null) is kept apart from `undisclosed` and is
 * never inferred from the name or other data.
 */
export const GENDERS = ['female', 'male', 'other', 'undisclosed'] as const;
export type Gender = (typeof GENDERS)[number];

/**
 * The participant's own words for "Jiná odpověď" (`genderOther`): voluntary,
 * trimmed, at most this long. Every other answer, and none, has no words.
 */
export const GENDER_OTHER_MAX_LENGTH = 100;

/** The whole stored answer of one registration. */
export type GenderAnswer = {
  gender: Gender | null;
  genderOther: string | null;
};

export const genderOtherFits = (
  gender: Gender | null,
  genderOther: string | null,
): boolean => genderOther === null || gender === 'other';

/**
 * Only "Žena" and "Muž" can place the participant by the answer; for every
 * other answer, and for none, the organizer decides the accommodation by hand.
 * The rule is the input of the evaluation (F13-1); the stored answer is never
 * replaced by a guess.
 */
export const requiresManualAccommodation = (gender: Gender | null): boolean =>
  gender !== 'female' && gender !== 'male';
