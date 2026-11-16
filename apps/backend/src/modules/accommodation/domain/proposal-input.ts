import { GENDER_ATTRIBUTE } from '@/modules/accommodation/domain/determination';
import {
  effectiveValue,
  HardAttribute,
  ManualValue,
} from '@/modules/accommodation/domain/effective-value';
import {
  ProposalRoom,
  RoommateWish,
  RoomProposalInput,
  SoftPreference,
} from '@/modules/accommodation/solver/room-proposal.types';

// The input of a room proposal (phase 2, spec §3) and the snapshot stored
// with it (§7.3). Who takes part is decided already: only the confirmed
// participants of the term are laid out.

/** The soft preference "Přání" in `accommodation_rules.softAttributes` (spec §9). */
export const WISHES_PREFERENCE = 'roommate-wishes';

/**
 * Answers of a categorical soft attribute that never count (spec §5.4); the
 * organizer sets them with #389. For gender: "Jiná odpověď", "Nechci uvést".
 */
const NEUTRAL_ANSWERS: Record<string, readonly string[]> = {
  [GENDER_ATTRIBUTE]: ['other', 'undisclosed'],
};

/** Pravidla ubytování as the room proposal reads them. */
export type ProposalRules = {
  hardAttribute: HardAttribute | null;
  /** Ranked soft preferences, most important first. */
  softAttributes: readonly string[];
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

/**
 * The ranked list of the room proposal. Until the organizer can set it
 * (#389) an empty list is the default of a new event: only "Přání" (spec
 * §5).
 */
export function preferencesOf(rules: ProposalRules): SoftPreference[] {
  const list = rules.softAttributes.length
    ? rules.softAttributes
    : [WISHES_PREFERENCE];
  return list.map((id) =>
    id === WISHES_PREFERENCE
      ? { kind: 'wishes' }
      : {
          kind: 'attribute',
          id,
          neutralValues: [...(NEUTRAL_ANSWERS[id] ?? [])],
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
