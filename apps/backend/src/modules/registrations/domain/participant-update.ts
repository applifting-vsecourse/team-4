import { ResultEventPayload } from '@/modules/accommodation/domain/term-decision';
import { ParticipationStatus } from '@/modules/registrations/domain/registration';
import { ChangeSummary } from '@/modules/registrations/domain/registration-change';
import { RegistrationNeeds } from '@/modules/registrations/domain/registration-needs';

/** The saved event a participant e-mail reports (F45-1). */
export type ParticipantUpdateReason =
  | 'evaluation'
  | 'waitlistConfirmed'
  | 'organizerChange'
  | 'balanceChanged'
  | 'requestReceived'
  | 'requestApproved'
  | 'requestRejected'
  | 'paymentRecorded';

/** `proposed`: a term a change request would add or move, not yet decided. */
export type UpdateTermStatus = ParticipationStatus | 'proposed';

export type UpdateTerm = {
  label: string;
  startDate: string;
  endDate: string;
  status: UpdateTermStatus;
};

/** One value a change request touches, as the participant reads it. */
export type UpdateChange = {
  label: string;
  original: string;
  proposed: string;
};

export type UpdatePayment = {
  /** The payment this message is about; only for `paymentRecorded`. */
  recorded: { amountMinor: number; receivedOn: string } | null;
  receivedMinor: number;
  /** Confirmed terms − payments: positive a debt, negative an overpayment. */
  balanceMinor: number;
  /** Null for a free event; a debt always has it. */
  bank: {
    prefix: string | null;
    number: string;
    bankCode: string;
    variableSymbol: string;
    /** Set once, from the first moment something was owed. */
    reminderAt: string | null;
  } | null;
};

/**
 * What the e-mail says, frozen in the transaction of the event. The link to
 * the app is not part of it: a token is issued only when the message is sent.
 */
export type ParticipantUpdatePayload = {
  reason: ParticipantUpdateReason;
  eventName: string;
  organizer: { name: string; email: string | null; phone: string | null };
  /** The valid terms after the event. */
  terms: UpdateTerm[];
  /** Only for `requestReceived`, kept apart from the valid terms. */
  proposedTerms: UpdateTerm[] | null;
  /** The values a change request touches; empty for every other event. */
  changes: UpdateChange[];
  payment: UpdatePayment;
  /** False when the contact e-mail is not the account's sign-in e-mail. */
  hasMagicLink: boolean;
};

/** Debt, overpayment or neither, from a balance. */
export const balanceKind = (
  balanceMinor: number,
): 'debt' | 'settled' | 'overpaid' =>
  balanceMinor > 0 ? 'debt' : balanceMinor < 0 ? 'overpaid' : 'settled';

/**
 * Whether the participant is told about a change they made themselves: only
 * when it moved what is owed (the other triggers have their own reasons).
 */
export const changedBalance = (before: number, after: number): boolean =>
  before !== after;

/** A term of the registration still counts when it is not released. */
export const isSelected = (term: { status: UpdateTermStatus }): boolean =>
  term.status !== 'cancelled';

const NOT_PROVIDED = 'Neuvedeno';

const GENDER_LABELS: Record<string, string> = {
  female: 'Žena',
  male: 'Muž',
  other: 'Jiná odpověď',
  undisclosed: 'Nechci uvést',
};
const TRANSPORT_LABELS: Record<string, string> = {
  own: 'Vlastní doprava',
  shared: 'Společná doprava',
};
const DIET_LABELS: Record<string, string> = {
  vegetarian: 'Vegetariánská',
  vegan: 'Veganská',
  gluten_free: 'Bezlepková',
  lactose_free: 'Bezlaktózová',
};
const FIELD_LABELS: Record<string, string> = {
  firstName: 'Jméno',
  lastName: 'Příjmení',
  phone: 'Telefon',
  gender: 'Pohlaví pro ubytování',
  genderOther: 'Vlastní odpověď',
};

const transportText = (needs: RegistrationNeeds): string =>
  [
    needs.transport ? TRANSPORT_LABELS[needs.transport] : '',
    needs.transportNote,
  ]
    .filter(Boolean)
    .join(' · ') || NOT_PROVIDED;

const dietText = (needs: RegistrationNeeds): string =>
  [
    needs.hasNoDietRestriction
      ? 'Bez omezení'
      : needs.diet.map((choice) => DIET_LABELS[choice]).join(', '),
    needs.dietNote,
  ]
    .filter(Boolean)
    .join(' · ') || NOT_PROVIDED;

// Health details are sensitive and e-mail is not a safe place for them: the
// message says that they changed, and the text stays in the app.
const healthText = (needs: RegistrationNeeds): string =>
  needs.health ? 'Uvedeno (text je jen v aplikaci)' : NOT_PROVIDED;

/** The values of a stored change summary, in the words of the app. */
export const changedValues = (
  summary: Pick<ChangeSummary, 'values'> & {
    needs?: ChangeSummary['needs'];
  },
): UpdateChange[] => {
  const text = (value: string | null): string => value ?? NOT_PROVIDED;
  const rows: UpdateChange[] = summary.values.map((value) => {
    if (value.field === 'gender') {
      const answer = (v: string | null): string =>
        v ? (GENDER_LABELS[v] ?? v) : NOT_PROVIDED;
      return {
        label: FIELD_LABELS.gender,
        original: answer(value.original),
        proposed: answer(value.proposed),
      };
    }
    return {
      label: FIELD_LABELS[value.field],
      original: text(value.original),
      proposed: text(value.proposed),
    };
  });
  const needs = summary.needs;
  if (needs) {
    for (const [label, format] of [
      ['Doprava', transportText],
      ['Strava', dietText],
      ['Zdravotní omezení', healthText],
    ] as const) {
      const original = format(needs.original);
      const proposed = format(needs.proposed);
      if (original !== proposed) rows.push({ label, original, proposed });
    }
  }
  return rows;
};

/**
 * A decision that gave a waitlisted term its place is the freed-place message;
 * every other decision (a batch or a single confirmation, a waitlisting) is
 * the evaluation result. The terms in the message carry each state.
 */
export const resultReason = (
  result: Pick<ResultEventPayload, 'decided'>,
): Extract<ParticipantUpdateReason, 'evaluation' | 'waitlistConfirmed'> =>
  result.decided.some(
    (term) => term.from === 'waitlisted' && term.to === 'confirmed',
  )
    ? 'waitlistConfirmed'
    : 'evaluation';
