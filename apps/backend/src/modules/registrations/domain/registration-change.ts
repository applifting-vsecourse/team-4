import { requiresApproval } from '@/modules/events/domain/change-approval';
import { Gender, genderOtherFits } from '@/modules/registrations/domain/gender';
import {
  amountDueMinor,
  ParticipationStatus,
  RegistrationTermResult,
} from '@/modules/registrations/domain/registration';
import {
  normalizeNeeds,
  RegistrationNeeds,
  sameNeeds,
} from '@/modules/registrations/domain/registration-needs';
import { TermCapacity } from '@/modules/rooms/domain/room';

/** Contact fields a participant may change; the e-mail is the identity (F35-2a). */
const TEXT_FIELDS = ['firstName', 'lastName', 'phone'] as const;
type TextField = (typeof TEXT_FIELDS)[number];

/**
 * The data a participant may change: the contact fields and the gender
 * answer with its own words for "Jiná odpověď" (F64).
 */
export const CHANGEABLE_FIELDS = [
  ...TEXT_FIELDS,
  'gender',
  'genderOther',
] as const;
export type ChangeableField = (typeof CHANGEABLE_FIELDS)[number];

export type TermMove = {
  fromTermId: string;
  toTermId: string;
  /** Consent to give up the confirmed place of `fromTermId`; the new term waits for the organizer. */
  acceptRelease: boolean;
};

/** What a participant proposes; a missing field stays as it is. */
export type ChangeProposal = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** Transport, diet and health as a whole (F63); "" or empty clears a part. */
  needs?: RegistrationNeeds;
  /** Null clears the answer back to "not answered" (F64). */
  gender?: Gender | null;
  /**
   * The own words for `other`; null removes them. Another answer drops them
   * without being asked.
   */
  genderOther?: string | null;
  moves: TermMove[];
  cancelledTermIds: string[];
};

export type ChangeKind = 'data' | 'move' | 'cancel_terms' | 'cancel_all';

export type ChangedValue =
  | { field: TextField; original: string; proposed: string }
  /** Null is "not answered". */
  | { field: 'gender'; original: Gender | null; proposed: Gender | null }
  /** Null is no own words. */
  | { field: 'genderOther'; original: string | null; proposed: string | null };

/** A term the change touches; null where it is not part of the registration. */
export type PlannedTerm = {
  termId: string;
  label: string;
  startDate: string;
  endDate: string;
  priceMinor: number;
  original: ParticipationStatus | null;
  proposed: ParticipationStatus | null;
};

export type Money = {
  /** Σ confirmed terms. */
  dueMinor: number;
  paidMinor: number;
  /** Due − paid: positive a debt, negative an overpayment. */
  balanceMinor: number;
};

/** The needs before and after; they change as one block (F63). */
export type NeedsChange = {
  original: RegistrationNeeds;
  proposed: RegistrationNeeds;
};

export type ChangeSummary = {
  values: ChangedValue[];
  /** Null when the needs stay as they are. */
  needs: NeedsChange | null;
  terms: PlannedTerm[];
  original: Money;
  proposed: Money;
};

export type PlannedMove = TermMove & {
  /** Always `pending`: the organizer decides the new term (S3-01). */
  resultStatus: ParticipationStatus;
  /** A confirmed place is given up for a term that is not decided yet. */
  requiresReleaseConsent: boolean;
};

export type ChangePlan = {
  kinds: ChangeKind[];
  summary: ChangeSummary;
  moves: PlannedMove[];
  requiresApproval: boolean;
};

export type ChangeErrorCode =
  | 'no_change'
  | 'registration_cancelled'
  | 'term_not_active'
  | 'term_unknown'
  | 'term_conflict'
  | 'gender_other_mismatch';

const MESSAGES: Record<ChangeErrorCode, string> = {
  no_change: 'Nic se nezměnilo.',
  registration_cancelled: 'Přihláška je odhlášená.',
  term_not_active: 'Termín není součástí přihlášky.',
  term_unknown: 'Termín nepatří k této akci.',
  term_conflict: 'Termíny změny si odporují.',
  gender_other_mismatch: 'Vlastní odpověď lze uvést jen u „Jiná odpověď“.',
};

export class InvalidChangeError extends Error {
  constructor(public readonly code: ChangeErrorCode) {
    super(MESSAGES[code]);
  }
}

/** The registration as the change sees it. */
export type ChangeSubject = {
  firstName: string;
  lastName: string;
  phone: string;
  needs: RegistrationNeeds;
  gender: Gender | null;
  genderOther: string | null;
  terms: RegistrationTermResult[];
  paidMinor: number;
};

/** A term of the event with its current price. */
export type EventTermInfo = Pick<
  TermCapacity,
  'id' | 'label' | 'startDate' | 'endDate'
> & { priceMinor: number };

const money = (
  terms: Pick<RegistrationTermResult, 'status' | 'priceMinor'>[],
  paidMinor: number,
): Money => {
  const dueMinor = amountDueMinor(terms);
  return { dueMinor, paidMinor, balanceMinor: dueMinor - paidMinor };
};

/**
 * Works out a proposal against the registration and the event's terms: what
 * changes, what each term ends as, and whether the organizer must approve
 * (affected terms by kind of change, F35-2a). A moved-to term waits for the
 * organizer's decision (S3-01), whatever its capacity. Pure.
 */
export const planChange = (
  subject: ChangeSubject,
  proposal: ChangeProposal,
  eventTerms: ReadonlyMap<string, EventTermInfo>,
  approvalDays: number | null,
  now: Date,
): ChangePlan => {
  const own = new Map(subject.terms.map((term) => [term.termId, term]));
  const active = subject.terms.filter((term) => term.status !== 'cancelled');
  if (active.length === 0)
    throw new InvalidChangeError('registration_cancelled');
  const isActive = (termId: string): boolean =>
    active.some((term) => term.termId === termId);

  const cancelled = new Set(proposal.cancelledTermIds);
  const fromIds = proposal.moves.map((move) => move.fromTermId);
  const toIds = proposal.moves.map((move) => move.toTermId);
  if (
    cancelled.size !== proposal.cancelledTermIds.length ||
    new Set(fromIds).size !== fromIds.length ||
    new Set(toIds).size !== toIds.length ||
    fromIds.some((id) => cancelled.has(id))
  ) {
    throw new InvalidChangeError('term_conflict');
  }
  if (![...cancelled, ...fromIds].every(isActive)) {
    throw new InvalidChangeError('term_not_active');
  }
  for (const toId of toIds) {
    if (!eventTerms.has(toId)) throw new InvalidChangeError('term_unknown');
    if (isActive(toId)) throw new InvalidChangeError('term_conflict');
  }

  const values: ChangedValue[] = [];
  for (const field of TEXT_FIELDS) {
    const proposed = proposal[field];
    if (proposed !== undefined && proposed !== subject[field]) {
      values.push({ field, original: subject[field], proposed });
    }
  }
  const gender =
    proposal.gender !== undefined ? proposal.gender : subject.gender;
  if (gender !== subject.gender) {
    values.push({
      field: 'gender',
      original: subject.gender,
      proposed: gender,
    });
  }
  const proposedOther =
    proposal.genderOther !== undefined
      ? proposal.genderOther
      : subject.genderOther;
  if (proposal.genderOther != null && !genderOtherFits(gender, proposedOther)) {
    throw new InvalidChangeError('gender_other_mismatch');
  }
  const genderOther = gender === 'other' ? proposedOther : null;
  if (genderOther !== subject.genderOther) {
    values.push({
      field: 'genderOther',
      original: subject.genderOther,
      proposed: genderOther,
    });
  }
  const needs: NeedsChange | null =
    proposal.needs !== undefined && !sameNeeds(subject.needs, proposal.needs)
      ? { original: subject.needs, proposed: normalizeNeeds(proposal.needs) }
      : null;
  // Names, phone, gender and needs belong to the whole registration.
  const changesData = values.length > 0 || needs !== null;
  if (!changesData && cancelled.size + proposal.moves.length === 0) {
    throw new InvalidChangeError('no_change');
  }

  const moves: PlannedMove[] = proposal.moves.map((move) => {
    const from = own.get(move.fromTermId) as RegistrationTermResult;
    return {
      ...move,
      resultStatus: 'pending',
      requiresReleaseConsent: from.status === 'confirmed',
    };
  });

  // Row per touched term; every active term when the data changes (it is a
  // change of the whole registration).
  const planned = new Map<string, PlannedTerm>();
  const rowOf = (term: RegistrationTermResult): PlannedTerm => ({
    termId: term.termId,
    label: term.label,
    startDate: term.startDate,
    endDate: term.endDate,
    priceMinor: term.priceMinor,
    original: term.status,
    proposed: term.status,
  });
  const touch = (termId: string): PlannedTerm => {
    const existing = planned.get(termId);
    if (existing) return existing;
    const term = own.get(termId);
    const row: PlannedTerm = term
      ? rowOf(term)
      : (() => {
          const info = eventTerms.get(termId) as EventTermInfo;
          return {
            termId,
            label: info.label,
            startDate: info.startDate,
            endDate: info.endDate,
            priceMinor: info.priceMinor,
            original: null,
            proposed: null,
          };
        })();
    planned.set(termId, row);
    return row;
  };
  if (changesData) for (const term of active) touch(term.termId);
  for (const termId of cancelled) touch(termId).proposed = 'cancelled';
  for (const move of moves) {
    touch(move.fromTermId).proposed = 'cancelled';
    const target = touch(move.toTermId);
    const info = eventTerms.get(move.toTermId) as EventTermInfo;
    // A term released earlier comes back at today's price.
    target.priceMinor = info.priceMinor;
    target.proposed = move.resultStatus;
  }

  const after = [...subject.terms.filter((t) => !planned.has(t.termId))];
  for (const row of planned.values()) {
    if (row.proposed !== null) {
      after.push({
        ...(own.get(row.termId) ?? row),
        status: row.proposed,
      } as RegistrationTermResult);
    }
  }

  const affected = [
    ...(changesData ? active : []),
    ...[...cancelled].map((id) => own.get(id) as RegistrationTermResult),
    ...moves.flatMap((move) => [
      own.get(move.fromTermId) as RegistrationTermResult,
      eventTerms.get(move.toTermId) as EventTermInfo,
    ]),
  ];

  const releasedAll = after.every((term) => term.status === 'cancelled');
  const kinds: ChangeKind[] = [];
  if (changesData) kinds.push('data');
  if (moves.length > 0) kinds.push('move');
  if (cancelled.size > 0)
    kinds.push(releasedAll ? 'cancel_all' : 'cancel_terms');

  return {
    kinds,
    moves,
    requiresApproval: requiresApproval(approvalDays, affected, now),
    summary: {
      values,
      needs,
      terms: [...planned.values()].sort(
        (a, b) =>
          a.startDate.localeCompare(b.startDate) ||
          a.termId.localeCompare(b.termId),
      ),
      original: money(subject.terms, subject.paidMinor),
      proposed: money(after, subject.paidMinor),
    },
  };
};

export type ChangedFields = Partial<Pick<ChangeSubject, ChangeableField>> &
  Partial<RegistrationNeeds>;

/** The names, phone, gender answer and needs after the change; used when applying it. */
export const changedFields = (
  summary: Pick<ChangeSummary, 'values' | 'needs'>,
): ChangedFields => ({
  ...(Object.fromEntries(
    summary.values.map((value) => [value.field, value.proposed]),
  ) as Partial<Pick<ChangeSubject, ChangeableField>>),
  ...summary.needs?.proposed,
});
