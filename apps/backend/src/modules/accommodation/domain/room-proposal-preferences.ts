import { GENDER_ATTRIBUTE } from '@/modules/accommodation/domain/determination';

// The ranked soft preferences of the room proposal (#389, phase 2 §5): "Přání"
// and categorical questions, each item outranking every one below it, with
// the neutral answers of each soft attribute (§5.4).

/** The soft preference "Přání" in `accommodation_rules.softAttributes` (spec §9). */
export const WISHES_PREFERENCE = 'roommate-wishes';

/** The list of a new event: only "Přání" (spec §5). */
export const DEFAULT_SOFT_ATTRIBUTES: readonly string[] = [WISHES_PREFERENCE];

/** A categorical question the organizer can rank as a soft attribute. */
export type SoftAttributeOption = {
  attribute: string;
  /** Every answer of the question. */
  values: readonly string[];
  /** The answers offered as neutral when the attribute is added to the list. */
  defaultNeutralValues: readonly string[];
};

/**
 * The categorical questions of an event (spec §5.4). Gender is the only one
 * today; "Jiná odpověď" and "Nechci uvést" are neutral by default. More come
 * with the categorical-questions story.
 */
export const SOFT_ATTRIBUTE_OPTIONS: readonly SoftAttributeOption[] = [
  {
    attribute: GENDER_ATTRIBUTE,
    values: ['female', 'male', 'other', 'undisclosed'],
    defaultNeutralValues: ['other', 'undisclosed'],
  },
];

/** One item of the list: "Přání", or a soft attribute with its neutral answers. */
export type SoftPreferenceItem =
  | { id: typeof WISHES_PREFERENCE }
  | { id: string; neutralValues: readonly string[] };

/** The neutral answers by soft attribute, as `accommodation_rules.softNeutralValues` stores them. */
export type SoftNeutralValues = Readonly<Record<string, readonly string[]>>;

/** The questions that can be soft attributes: never the hard attribute. */
export const softAttributeOptions = (
  hardAttribute: string | null,
): SoftAttributeOption[] =>
  SOFT_ATTRIBUTE_OPTIONS.filter((option) => option.attribute !== hardAttribute);

/** The stored list and neutral answers as items, in the stored order. */
export function preferenceItems(
  softAttributes: readonly string[],
  neutral: SoftNeutralValues,
): SoftPreferenceItem[] {
  return softAttributes.map((id) =>
    id === WISHES_PREFERENCE
      ? { id }
      : { id, neutralValues: [...(neutral[id] ?? [])] },
  );
}

/** Reads `accommodation_rules.softNeutralValues`, dropping anything but lists of strings. */
export function readNeutralValues(json: unknown): SoftNeutralValues {
  if (typeof json !== 'object' || json === null || Array.isArray(json))
    return {};
  return Object.fromEntries(
    Object.entries(json).filter(
      (entry): entry is [string, string[]] =>
        Array.isArray(entry[1]) &&
        entry[1].every((value) => typeof value === 'string'),
    ),
  );
}

/**
 * Why the list cannot be saved, or null when it can: every item once, each
 * one "Přání" or a categorical question, and neutral answers only among the
 * question's answers. Whether it is the hard attribute is checked where the
 * rules are locked.
 */
export function invalidPreferences(
  items: readonly { id: string; neutralValues?: readonly string[] }[],
): string | null {
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length)
    return 'Každou preferenci lze v seznamu uvést jen jednou.';
  for (const item of items) {
    if (item.id === WISHES_PREFERENCE) {
      if (item.neutralValues?.length) return 'Přání nemají neutrální hodnoty.';
      continue;
    }
    const option = SOFT_ATTRIBUTE_OPTIONS.find((o) => o.attribute === item.id);
    if (!option) return 'Vyberte preference z nabídky.';
    const neutral = item.neutralValues ?? [];
    if (new Set(neutral).size !== neutral.length)
      return 'Neutrální hodnotu lze uvést jen jednou.';
    if (neutral.some((value) => !option.values.includes(value)))
      return 'Neutrální hodnoty vyberte z odpovědí otázky.';
  }
  return null;
}

/** The list and neutral answers to store for valid items. */
export function storedPreferences(
  items: readonly { id: string; neutralValues?: readonly string[] }[],
): { softAttributes: string[]; softNeutralValues: Record<string, string[]> } {
  return {
    softAttributes: items.map((item) => item.id),
    softNeutralValues: Object.fromEntries(
      items
        .filter((item) => item.id !== WISHES_PREFERENCE)
        .map((item) => [item.id, [...(item.neutralValues ?? [])]]),
    ),
  };
}

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value) => b.includes(value));

/** Whether two stored lists rank the same items with the same neutral answers. */
export function samePreferences(
  a: {
    softAttributes: readonly string[];
    softNeutralValues: SoftNeutralValues;
  },
  b: {
    softAttributes: readonly string[];
    softNeutralValues: SoftNeutralValues;
  },
): boolean {
  return (
    a.softAttributes.length === b.softAttributes.length &&
    a.softAttributes.every(
      (id, i) =>
        id === b.softAttributes[i] &&
        sameSet(a.softNeutralValues[id] ?? [], b.softNeutralValues[id] ?? []),
    )
  );
}
