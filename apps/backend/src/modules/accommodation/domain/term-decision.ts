import { amountDueMinor } from '@/modules/registrations/domain/registration';

// Deciding on participation in a term (S3-02, spec v4 §3): the organizer
// confirms the suitable people of the current proposal at once, or one person
// at a time confirms or waitlists. A recalculation never does either.

export type DecisionTerm = 'pending' | 'confirmed' | 'waitlisted' | 'cancelled';

/** Why a decision was not saved; nothing was written. */
export type DecisionRefusal =
  /** The proposal no longer matches the term's inputs. */
  | 'proposal_stale'
  /** The run is not a solved proposal. */
  | 'proposal_unavailable'
  /** The proposal has nobody suitable. */
  | 'nothing_to_confirm'
  /** The person is already confirmed or has left the term. */
  | 'not_undecided'
  | 'already_waitlisted'
  /** A hard attribute applies and the person has no effective value. */
  | 'determination_required'
  /** The term's remaining beds cannot take the person. */
  | 'no_capacity'
  /** The rooms cannot take the person with the confirmed ones. */
  | 'incompatible_rooms';

/** A term of a registration as the result event states it. */
export type ResultTerm = {
  termId: string;
  label: string;
  startDate: string;
  endDate: string;
  status: DecisionTerm;
  priceMinor: number;
};

/**
 * What the participant e-mail (F45-1) is built from: only the registration's
 * own terms and payment, at the moment of the decision. No internal reason
 * and no data of other people (S3-02).
 */
export type ResultEventPayload = {
  /** The terms this decision changed. */
  decided: { termId: string; from: DecisionTerm; to: DecisionTerm }[];
  terms: ResultTerm[];
  payment: {
    amountDueMinor: number;
    paidMinor: number;
    balanceMinor: number;
    variableSymbol: string;
    /** When the first reminder is due; null when none is set. */
    reminderAt: string | null;
  };
};

export function resultPayload(input: {
  decided: ResultEventPayload['decided'];
  terms: ResultTerm[];
  paidMinor: number;
  variableSymbol: string;
  reminderAt: Date | null;
}): ResultEventPayload {
  const due = amountDueMinor(input.terms);
  return {
    decided: input.decided,
    terms: input.terms,
    payment: {
      amountDueMinor: due,
      paidMinor: input.paidMinor,
      balanceMinor: due - input.paidMinor,
      variableSymbol: input.variableSymbol,
      reminderAt: input.reminderAt?.toISOString() ?? null,
    },
  };
}
