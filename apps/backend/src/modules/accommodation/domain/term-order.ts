// The order of a term (spec v4 §1, §6): one order of every unconfirmed
// participant of the term. It decides priority in the solver only among
// solutions accommodating the same number of people (§7.3).

/** A participant of the term, by registration. */
export type OrderEntry = {
  registrationId: string;
  receivedAt: Date;
};

/** Received earlier first; at the same millisecond the lower id (uuid v7). */
const compare = (a: OrderEntry, b: OrderEntry): number =>
  a.receivedAt.getTime() - b.receivedAt.getTime() ||
  (a.registrationId < b.registrationId
    ? -1
    : a.registrationId > b.registrationId
      ? 1
      : 0);

/**
 * The term order: the stored manual order (F39-1) where there is one, else by
 * receipt. Someone the stored order does not list (registered or moved into
 * the term later) goes right after everyone received before them, the moved
 * ones included. Ids in the stored order who are no longer unconfirmed in the
 * term are left out.
 */
export function termOrder(
  entries: OrderEntry[],
  storedOrder: readonly string[] | null,
): string[] {
  const byId = new Map(entries.map((entry) => [entry.registrationId, entry]));
  const order = (storedOrder ?? [])
    .filter((id) => byId.has(id))
    .map((id) => byId.get(id) as OrderEntry);
  const listed = new Set(order.map((entry) => entry.registrationId));

  for (const entry of entries
    .filter((candidate) => !listed.has(candidate.registrationId))
    .sort(compare)) {
    let after = -1;
    order.forEach((placed, index) => {
      if (compare(placed, entry) < 0) after = index;
    });
    order.splice(after + 1, 0, entry);
  }
  return order.map((entry) => entry.registrationId);
}
