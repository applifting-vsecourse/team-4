import {
  effectiveValue,
  HardAttribute,
  ManualValue,
} from '@/modules/accommodation/domain/effective-value';
import { termOrder } from '@/modules/accommodation/domain/term-order';
import { SolverInput } from '@/modules/accommodation/solver/solver.types';

/** Pravidla ubytování of the event (spec v4 §2). */
export type AccommodationRules = {
  hardAttribute: HardAttribute | null;
  softAttributes: string[];
};

export const NO_RULES: AccommodationRules = {
  hardAttribute: null,
  softAttributes: [],
};

/** A room available in the term, with that term's beds (F11-1). */
export type TermRoom = {
  roomId: string;
  label: string;
  baseBeds: number;
  extraBeds: number;
};

/** An active participation in the term. */
export type TermParticipant = {
  registrationId: string;
  /** Unconfirmed (waitlisted, later also pending) ones are candidates. */
  isConfirmed: boolean;
  receivedAt: Date;
  /** The answer to the hard attribute; null when not given. */
  answer: string | null;
  manualValue: ManualValue | null;
};

/** One participant as the run used them; the evidence of the order (F39-1). */
export type SnapshotParticipant = {
  registrationId: string;
  receivedAt: string;
  answer: string | null;
  /** The organizer's determination, when it was valid for this answer. */
  manualValue: string | null;
  effectiveValue: string | null;
};

/** Everything a run decided from, stored with it and never rewritten. */
export type EvaluationSnapshot = {
  rules: AccommodationRules;
  rooms: TermRoom[];
  confirmed: SnapshotParticipant[];
  /** The term order of the unconfirmed participants, highest priority first. */
  order: (SnapshotParticipant & { position: number })[];
  /** Whether a manual order (F39-1) applied. */
  isOrderManual: boolean;
};

const snapshotOf = (
  rules: AccommodationRules,
  participant: TermParticipant,
): SnapshotParticipant => {
  const value = effectiveValue(
    rules.hardAttribute,
    participant.answer,
    participant.manualValue,
  );
  const isManualUsed =
    rules.hardAttribute !== null &&
    participant.manualValue !== null &&
    participant.manualValue.basedOnAnswer === participant.answer;
  return {
    registrationId: participant.registrationId,
    receivedAt: participant.receivedAt.toISOString(),
    answer: participant.answer,
    manualValue: isManualUsed
      ? (participant.manualValue as ManualValue).value
      : null,
    effectiveValue: value,
  };
};

/**
 * The solver input for one term and the snapshot that documents it. Phase 1:
 * no rooms of participants and no soft values; who is suitable only.
 */
export function buildEvaluation(
  rules: AccommodationRules,
  rooms: TermRoom[],
  participants: TermParticipant[],
  storedOrder: readonly string[] | null,
): { input: SolverInput; snapshot: EvaluationSnapshot } {
  const confirmed = participants
    .filter((participant) => participant.isConfirmed)
    .map((participant) => snapshotOf(rules, participant));
  const unconfirmed = participants.filter(
    (participant) => !participant.isConfirmed,
  );
  const byId = new Map(
    unconfirmed.map((participant) => [participant.registrationId, participant]),
  );
  const order = termOrder(unconfirmed, storedOrder).map((id, position) => ({
    ...snapshotOf(rules, byId.get(id) as TermParticipant),
    position,
  }));

  return {
    input: {
      rooms: rooms.map((room) => ({
        id: room.roomId,
        baseBeds: room.baseBeds,
        extraBeds: room.extraBeds,
      })),
      hasHardAttribute: rules.hardAttribute !== null,
      softAttributes: rules.softAttributes,
      confirmed: confirmed.map((participant) => ({
        id: participant.registrationId,
        value: participant.effectiveValue,
      })),
      candidates: order.map((participant) => ({
        id: participant.registrationId,
        value: participant.effectiveValue,
        position: participant.position,
      })),
    },
    snapshot: {
      rules,
      rooms,
      confirmed,
      order,
      isOrderManual: storedOrder !== null,
    },
  };
}
