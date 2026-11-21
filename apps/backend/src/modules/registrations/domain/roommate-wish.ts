// Přání na spolubydlící (S4-05, #339): a participant confirmed in at least one
// term of an event picks other participants confirmed in the same event. The
// wish is one-sided and for the whole event; the organizer weighs it in the
// terms both take part in (phase-2 spec §5.3, #317).

/** Another participant of the event, named as the registration names them. */
export type Roommate = { registrationId: string; name: string };

export type RoommateWishes = {
  /** Other confirmed participants of the event, by name; never the author. */
  candidates: Roommate[];
  /** The stored wishes, by name; may name someone no longer a candidate. */
  wishes: Roommate[];
};

/** At most this many wishes per registration (a room is rarely bigger). */
export const MAX_ROOMMATE_WISHES = 20;

export const fullName = (person: {
  firstName: string;
  lastName: string;
}): string => `${person.firstName} ${person.lastName}`.trim();

/** By name in Czech order, then by id, so equal names keep a stable order. */
export const byName = (a: Roommate, b: Roommate): number =>
  a.name.localeCompare(b.name, 'cs') ||
  (a.registrationId < b.registrationId ? -1 : 1);

/**
 * Why a new list cannot be stored, or null when it can: no repeats, never the
 * author, and only candidates or people already wished for. Keeping a stored
 * wish for someone no longer confirmed is allowed, so editing the rest of
 * the list never forces removing it; adding a non-candidate is not.
 */
export function invalidWishes(
  authorId: string,
  next: readonly string[],
  candidates: ReadonlySet<string>,
  stored: ReadonlySet<string>,
): string | null {
  if (new Set(next).size !== next.length)
    return 'Každého spolubydlícího lze vybrat jen jednou.';
  if (next.length > MAX_ROOMMATE_WISHES)
    return `Vyberte nejvýš ${MAX_ROOMMATE_WISHES} spolubydlících.`;
  if (next.includes(authorId)) return 'Sám sebe vybrat nelze.';
  if (next.some((id) => !candidates.has(id) && !stored.has(id)))
    return 'Vyberte potvrzené účastníky této akce.';
  return null;
}
