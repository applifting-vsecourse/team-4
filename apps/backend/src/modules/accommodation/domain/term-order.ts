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

export type Placement = 'before' | 'after';

/** An unconfirmed participant of the term, with the queue they belong to. */
export type QueueMember = {
  registrationId: string;
  /** Null with a hard attribute: no queue until a manual determination. */
  effectiveValue: string | null;
};

/**
 * person_not_movable: confirmed, not in the term, or with a hard attribute
 * still waiting for a manual determination. target_invalid: the target is the
 * person, or not in the same queue. order_unchanged: the person already
 * stands there.
 */
export type MoveRefusal =
  'person_not_movable' | 'target_invalid' | 'order_unchanged';

export type OrderMove = {
  /** The queue: the effective value, null for the one queue without a hard attribute. */
  queue: string | null;
  /** The whole term order before and after. */
  before: string[];
  after: string[];
  /** The queue, i.e. the term order filtered by the effective value. */
  queueBefore: string[];
  queueAfter: string[];
  /** In the term order, 1 is the highest priority. */
  fromPosition: number;
  toPosition: number;
};

/**
 * Places an unconfirmed person right before or after another one of the same
 * queue (spec v4 §6). The queue is a filtered view of the term order, so the
 * term order changes: the person stands right next to the target in it. No
 * position number can be chosen; nothing else moves.
 */
export function moveInOrder(
  order: readonly string[],
  members: readonly QueueMember[],
  hasHardAttribute: boolean,
  move: { registrationId: string; targetId: string; placement: Placement },
):
  | { kind: 'moved'; move: OrderMove }
  | { kind: 'refused'; refusal: MoveRefusal } {
  const valueOf = new Map(
    members.map((member) => [member.registrationId, member.effectiveValue]),
  );
  const isMovable = (id: string): boolean =>
    order.includes(id) &&
    valueOf.has(id) &&
    (!hasHardAttribute || valueOf.get(id) !== null);
  if (!isMovable(move.registrationId)) {
    return { kind: 'refused', refusal: 'person_not_movable' };
  }
  const queue = hasHardAttribute
    ? (valueOf.get(move.registrationId) ?? null)
    : null;
  if (
    move.targetId === move.registrationId ||
    !isMovable(move.targetId) ||
    (hasHardAttribute && valueOf.get(move.targetId) !== queue)
  ) {
    return { kind: 'refused', refusal: 'target_invalid' };
  }

  const after = order.filter((id) => id !== move.registrationId);
  const targetIndex = after.indexOf(move.targetId);
  after.splice(
    move.placement === 'before' ? targetIndex : targetIndex + 1,
    0,
    move.registrationId,
  );
  if (after.every((id, index) => id === order[index])) {
    return { kind: 'refused', refusal: 'order_unchanged' };
  }
  const inQueue = (id: string): boolean =>
    !hasHardAttribute || valueOf.get(id) === queue;
  return {
    kind: 'moved',
    move: {
      queue,
      before: [...order],
      after,
      queueBefore: order.filter(inQueue),
      queueAfter: after.filter(inQueue),
      fromPosition: order.indexOf(move.registrationId) + 1,
      toPosition: after.indexOf(move.registrationId) + 1,
    },
  };
}
