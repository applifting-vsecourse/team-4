import {
  effectiveValue,
  HardAttribute,
  ManualValue,
} from '@/modules/accommodation/domain/effective-value';
import {
  SoftNeutralValues,
  WISHES_PREFERENCE,
} from '@/modules/accommodation/domain/room-proposal-preferences';
import {
  ProposalRoom,
  RoommateWish,
  RoomProposalInput,
  SoftPreference,
} from '@/modules/accommodation/solver/room-proposal.types';

// The input of a room proposal (phase 2, spec §3) and the snapshot stored
// with it (§7.3). Who takes part is decided already: only the confirmed
// participants of the term are laid out.

/** Pravidla ubytování as the room proposal reads them. */
export type ProposalRules = {
  hardAttribute: HardAttribute | null;
  /** Ranked soft preferences, most important first (#389). */
  softAttributes: readonly string[];
  /** The neutral answers of each listed soft attribute (§5.4). */
  softNeutralValues: SoftNeutralValues;
};

/** A room of the event with its beds in the term; unavailable ones too (O6). */
export type ProposalTermRoom = Omit<ProposalRoom, 'id'> & { roomId: string };

/** A confirmed participant of the term. */
export type ProposalPerson = {
  registrationId: string;
  receivedAt: Date;
  /** The answer to the hard attribute; null when not given. */
  answer: string | null;
  manualValue: ManualValue | null;
  /** Answers to the soft attributes of the list, by attribute. */
  softAnswers: Record<string, string | null>;
};

/** Saved placements (F14-2, #337): this term's and the person's other terms'. */
export type ProposalPlacements = {
  saved: ReadonlyMap<string, { roomId: string; isLocked: boolean }>;
  otherTerms: ReadonlyMap<string, readonly string[]>;
};

/** Everything a proposal decided from, stored with it and never rewritten. */
export type ProposalSnapshot = {
  rules: ProposalRules;
  input: RoomProposalInput;
};

/** The ranked list of the room proposal; an empty one skips U3 (spec §5). */
export function preferencesOf(rules: ProposalRules): SoftPreference[] {
  return rules.softAttributes.map((id) =>
    id === WISHES_PREFERENCE
      ? { kind: 'wishes' }
      : {
          kind: 'attribute',
          id,
          neutralValues: [...(rules.softNeutralValues[id] ?? [])],
        },
  );
}

/** The soft attributes whose answers the proposal needs. */
export const softAttributesOf = (rules: ProposalRules): string[] =>
  rules.softAttributes.filter((id) => id !== WISHES_PREFERENCE);

export function buildProposal(
  rules: ProposalRules,
  rooms: readonly ProposalTermRoom[],
  people: readonly ProposalPerson[],
  placements: ProposalPlacements,
  wishes: readonly RoommateWish[],
): ProposalSnapshot {
  // Person order (§2): received first, then the registration id.
  const ordered = [...people].sort(
    (a, b) =>
      a.receivedAt.getTime() - b.receivedAt.getTime() ||
      (a.registrationId < b.registrationId ? -1 : 1),
  );
  const input: RoomProposalInput = {
    rooms: rooms.map(({ roomId, ...room }) => ({ id: roomId, ...room })),
    hasHardAttribute: rules.hardAttribute !== null,
    participants: ordered.map((person, position) => {
      const saved = placements.saved.get(person.registrationId);
      return {
        id: person.registrationId,
        position,
        value: effectiveValue(
          rules.hardAttribute,
          person.answer,
          person.manualValue,
        ),
        softValues: { ...person.softAnswers },
        ...(saved ? { savedRoomId: saved.roomId, locked: saved.isLocked } : {}),
        otherTermRoomIds: [
          ...(placements.otherTerms.get(person.registrationId) ?? []),
        ],
      };
    }),
    wishes: [...wishes],
    preferences: preferencesOf(rules),
  };
  return { rules, input };
}
