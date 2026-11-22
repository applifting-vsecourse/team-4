import {
  ProposalParticipant,
  ProposalRoom,
  ProposalScores,
  ProposalUnplacedReason,
  RoommateWish,
  RoomProposalInput,
  RoomWarning,
  WishState,
} from './room-proposal.types';

// What the room proposal needs before and after solving, without HiGHS:
// the room and person orders, locks, closed rooms (O5), lock conflicts (O6),
// the rooms each person may take, and the scores of a finished layout (§5).

const collator = new Intl.Collator('cs', {
  numeric: true,
  sensitivity: 'base',
});
/** Code-point order, independent of the runtime locale. */
const byCode = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Room order (§2): label in Czech collation with numbers, then id. */
export const compareRooms = (
  a: Pick<ProposalRoom, 'id' | 'label'>,
  b: Pick<ProposalRoom, 'id' | 'label'>,
): number => collator.compare(a.label, b.label) || byCode(a.id, b.id);

export const capacity = (room: ProposalRoom): number =>
  room.baseBeds + room.extraBeds;

export type PreparedProposal = {
  hasHardAttribute: boolean;
  /** Rooms available in the term, in room order (§2). */
  rooms: ProposalRoom[];
  /** Everyone except lock conflicts, in person order. */
  participants: ProposalParticipant[];
  /** Room index of each locked participant, by participant index. */
  locked: Map<number, number>;
  /** Rooms closed by locks (O5). */
  closed: Set<number>;
  warnings: RoomWarning[];
  lockConflicts: { id: string; roomId: string }[];
  /** Rooms each participant may take: the locked room, or every open room. */
  allowed: number[][];
  /** U2: rooms of other terms available here, for people unplaced here (§5.2). */
  crossTermRooms: number[][];
  /** Index of the unlocked saved room, when it is available (U4). */
  savedRoom: (number | undefined)[];
  /** Wishes between two participants of the term, without duplicates. */
  wishes: RoommateWish[];
  preferences: RoomProposalInput['preferences'];
};

export function prepareProposal(input: RoomProposalInput): PreparedProposal {
  const rooms = input.rooms.filter((room) => room.available).sort(compareRooms);
  const roomIndex = new Map(rooms.map((room, r) => [room.id, r]));
  const sorted = [...input.participants].sort(
    (a, b) => a.position - b.position || byCode(a.id, b.id),
  );

  // A lock to a room the term does not offer cannot be kept or replaced (O6).
  const lockConflicts = sorted.flatMap((p) =>
    p.locked && p.savedRoomId && !roomIndex.has(p.savedRoomId)
      ? [{ id: p.id, roomId: p.savedRoomId }]
      : [],
  );
  const conflicting = new Set(lockConflicts.map((c) => c.id));
  const participants = sorted.filter((p) => !conflicting.has(p.id));

  const locked = new Map<number, number>();
  participants.forEach((p, i) => {
    if (p.locked && p.savedRoomId) locked.set(i, roomIndex.get(p.savedRoomId)!);
  });

  const warnings: RoomWarning[] = [];
  const closed = new Set<number>();
  rooms.forEach((room, r) => {
    const inside = [...locked].filter(([, room]) => room === r);
    const values = new Set(inside.map(([i]) => participants[i]!.value));
    const mixed = input.hasHardAttribute && values.size > 1;
    const overCapacity = inside.length > capacity(room);
    if (mixed) warnings.push({ roomId: room.id, kind: 'mixed' });
    if (overCapacity) warnings.push({ roomId: room.id, kind: 'overCapacity' });
    if (mixed || overCapacity) closed.add(r);
  });
  const open = rooms.flatMap((room, r) =>
    capacity(room) > 0 && !closed.has(r) ? [r] : [],
  );

  // Every list that steers the search is put in one order, so the same
  // input gives the same proposal however its arrays are ordered.
  const order = new Map(sorted.map((p, i) => [p.id, i]));
  const wishes = [
    ...new Map(
      input.wishes
        .filter((w) => w.from !== w.to && order.has(w.from) && order.has(w.to))
        .map((w) => [`${w.from}\n${w.to}`, w]),
    ).values(),
  ].sort(
    (a, b) =>
      order.get(a.from)! - order.get(b.from)! ||
      order.get(a.to)! - order.get(b.to)!,
  );

  return {
    hasHardAttribute: input.hasHardAttribute,
    rooms,
    participants,
    locked,
    closed,
    warnings,
    lockConflicts,
    allowed: participants.map((_, i) =>
      locked.has(i) ? [locked.get(i)!] : open,
    ),
    crossTermRooms: participants.map((p) =>
      p.savedRoomId
        ? []
        : [
            ...new Set(
              p.otherTermRoomIds.flatMap((id) =>
                roomIndex.has(id) ? [roomIndex.get(id)!] : [],
              ),
            ),
          ].sort((a, b) => a - b),
    ),
    savedRoom: participants.map((p, i) =>
      !locked.has(i) && p.savedRoomId
        ? roomIndex.get(p.savedRoomId)
        : undefined,
    ),
    // Wishes of a lock conflict stay unmet (§5.3); they are scored, not solved.
    wishes: wishes.map((w) => ({ from: w.from, to: w.to })),
    // An item listed twice counts once, at its first place.
    preferences: input.preferences.filter(
      (preference, k) =>
        input.preferences.findIndex(
          (other) => preferenceKey(other) === preferenceKey(preference),
        ) === k,
    ),
  };
}

const preferenceKey = (
  preference: RoomProposalInput['preferences'][number],
): string =>
  preference.kind === 'wishes' ? 'wishes' : `attribute:${preference.id}`;

/** Room index by participant index; undefined = no room. */
export type Layout = (number | undefined)[];

const isNeutral = (
  value: string | null | undefined,
  neutral: string[],
): boolean => value === null || value === undefined || neutral.includes(value);

/** Levels U1–U6 of a layout (§5). */
export function scoreLayout(
  prepared: PreparedProposal,
  layout: Layout,
): ProposalScores {
  const { participants, rooms } = prepared;
  const occupants = rooms.map((_, r) =>
    participants.filter((_, i) => layout[i] === r),
  );
  const states = wishStates(prepared, layout);
  return {
    placed: layout.filter((room) => room !== undefined).length,
    crossTerm: participants.filter((_, i) => {
      const own = prepared.crossTermRooms[i]!;
      const room = layout[i];
      return own.length > 0 && room !== undefined && !own.includes(room);
    }).length,
    preferences: prepared.preferences.map((preference) =>
      preference.kind === 'wishes'
        ? states.filter((w) => w.state !== 'satisfied').length
        : occupants.reduce((sum, inside) => {
            const values = new Set(
              inside
                .map((p) => p.softValues[preference.id])
                .filter((v) => !isNeutral(v, preference.neutralValues)),
            );
            return sum + Math.max(0, values.size - 1);
          }, 0),
    ),
    moves: participants.filter(
      (p, i) =>
        !prepared.locked.has(i) &&
        p.savedRoomId !== undefined &&
        (prepared.savedRoom[i] === undefined ||
          layout[i] !== prepared.savedRoom[i]),
    ).length,
    extraBeds: rooms.reduce(
      (sum, room, r) => sum + Math.max(0, occupants[r]!.length - room.baseBeds),
      0,
    ),
    rooms: occupants.filter((inside) => inside.length > 0).length,
  };
}

export function wishStates(
  prepared: PreparedProposal,
  layout: Layout,
): (RoommateWish & { state: WishState })[] {
  const index = new Map(prepared.participants.map((p, i) => [p.id, i]));
  return prepared.wishes.map((wish) => {
    const a = index.get(wish.from);
    const b = index.get(wish.to);
    const roomA = a === undefined ? undefined : layout[a];
    const roomB = b === undefined ? undefined : layout[b];
    let state: WishState;
    if (roomA !== undefined && roomA === roomB) state = 'satisfied';
    else if (
      prepared.hasHardAttribute &&
      a !== undefined &&
      b !== undefined &&
      prepared.participants[a]!.value !== prepared.participants[b]!.value
    )
      state = 'impossible';
    else if (roomA === undefined || roomB === undefined) state = 'unplaced';
    else state = 'unsatisfied';
    return { ...wish, state };
  });
}

/** Reasons of §6 for participants left without a room. */
export function unplacedReasons(
  prepared: PreparedProposal,
  layout: Layout,
): { id: string; reason: ProposalUnplacedReason }[] {
  const { rooms, participants } = prepared;
  // One reason for everyone: U1 placed as many as fit, so a free bed left
  // over is one these people may not take.
  const anyRoom = rooms.length > 0;
  const freeBeds = rooms.reduce(
    (sum, room, r) =>
      sum +
      Math.max(0, capacity(room) - layout.filter((room) => room === r).length),
    0,
  );
  const reason: ProposalUnplacedReason = !anyRoom
    ? 'N'
    : freeBeds > 0
      ? 'H'
      : 'K';
  return participants.flatMap((p, i) =>
    layout[i] === undefined ? [{ id: p.id, reason }] : [],
  );
}
