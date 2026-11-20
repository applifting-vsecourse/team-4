import { ResultEventPayload } from '@/modules/accommodation/domain/term-decision';
import { ParticipationStatus } from '@/modules/registrations/domain/registration';
import { ChangeSummary } from '@/modules/registrations/domain/registration-change';

// Oznámení of the participant portal (S4-06). A notification is a saved event
// of the participant's own registration: an organizer decision on its terms,
// a decided change request, or a received payment. The events are read where
// they are already saved; only what the participant did with them is stored.

export type NotificationKind =
  'decision' | 'changeApproved' | 'changeRejected' | 'payment';

/** A term the event touched, with its state after the event. */
export type NotificationTerm = {
  label: string;
  startDate: string;
  endDate: string;
  status: ParticipationStatus;
};

export type ParticipantNotification = {
  /** The id of the saved event (decision, change request or payment). */
  id: string;
  kind: NotificationKind;
  registrationId: string;
  eventName: string;
  /** When the event was saved. */
  at: Date;
  isRead: boolean;
  /** The terms a decision or change request touched; empty for a payment. */
  terms: NotificationTerm[];
  /** The received amount; only for a payment. */
  amountMinor: number | null;
};

/** The terms a decision changed, in the state the decision gave them. */
export const decisionTerms = (
  payload: Pick<ResultEventPayload, 'decided' | 'terms'>,
): NotificationTerm[] =>
  payload.decided.flatMap((decided) => {
    const term = payload.terms.find((t) => t.termId === decided.termId);
    return term
      ? [
          {
            label: term.label,
            startDate: term.startDate,
            endDate: term.endDate,
            status: decided.to,
          },
        ]
      : [];
  });

/**
 * The terms a change request asked to change. Approved, they are in the
 * proposed state; rejected, they keep the state they had.
 */
export const changeTerms = (
  summary: Pick<ChangeSummary, 'terms'>,
  outcome: 'approved' | 'rejected',
): NotificationTerm[] =>
  summary.terms.flatMap((term) => {
    if (term.proposed === null || term.proposed === term.original) return [];
    const status = outcome === 'approved' ? term.proposed : term.original;
    // A term the rejected request would have added was never the registration's.
    if (status === null) return [];
    return [
      {
        label: term.label,
        startDate: term.startDate,
        endDate: term.endDate,
        status,
      },
    ];
  });

/** Newest first; events saved at the same moment by id, newest first too. */
export const newestFirst = (
  a: Pick<ParticipantNotification, 'at' | 'id'>,
  b: Pick<ParticipantNotification, 'at' | 'id'>,
): number =>
  b.at.getTime() - a.at.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
