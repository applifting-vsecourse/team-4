// Effective value of the hard attribute (spec v4 §1, §4): the participant's
// determining answer, or the value the organizer determined. Without one the
// participant needs a manual determination (reason R); no value is guessed.

/** The event's hard attribute (§2); null when rooms are not split by one. */
export type HardAttribute = {
  /** The categorical question the organizer marked as determining. */
  attribute: string;
  /** Answers that do not determine a room, e.g. "Nechci uvést". */
  nonDeterminingValues: readonly string[];
  /**
   * Every answer of the question, so the values an organizer may determine
   * (#485). Absent in evaluation snapshots stored before questions existed,
   * which only ever used gender.
   */
  values?: readonly string[];
};

/** The organizer's determination; valid only for the answer it was made on. */
export type ManualValue = {
  /** The attribute it was made for; it counts only while that one is the hard attribute (#485). */
  attribute: string;
  value: string;
  /** The answer at the time; any later change of it cancels the determination. */
  basedOnAnswer: string | null;
};

/**
 * Null without a hard attribute (every participant is alike), or when the
 * participant has neither a determining answer nor a valid determination.
 */
export function effectiveValue(
  hardAttribute: HardAttribute | null,
  answer: string | null,
  manual: ManualValue | null,
): string | null {
  if (!hardAttribute) return null;
  if (
    manual &&
    manual.attribute === hardAttribute.attribute &&
    manual.basedOnAnswer === answer &&
    // An option removed since no longer counts (#485).
    (hardAttribute.values === undefined ||
      hardAttribute.values.includes(manual.value))
  )
    return manual.value;
  if (answer !== null && !hardAttribute.nonDeterminingValues.includes(answer)) {
    return answer;
  }
  return null;
}
