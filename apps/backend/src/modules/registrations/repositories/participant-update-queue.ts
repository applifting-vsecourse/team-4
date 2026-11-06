import { Prisma } from '@/generated/prisma/client';
import { fromDate } from '@/modules/events/domain/calendar-date';
import {
  changedValues,
  ParticipantUpdatePayload,
  ParticipantUpdateReason,
  UpdateChange,
  UpdatePayment,
  UpdateTerm,
} from '@/modules/registrations/domain/participant-update';
import { normalizeEmail } from '@/modules/registrations/domain/registration';
import {
  ChangeSummary,
  PlannedTerm,
} from '@/modules/registrations/domain/registration-change';

type Db = Prisma.TransactionClient;

export type QueueUpdateInput = {
  registrationId: string;
  reason: ParticipantUpdateReason;
  /** One saved event, one key: a repeat of the event queues nothing. */
  dedupKey: string;
  /** The payment this message is about (`paymentRecorded`). */
  paymentId?: string;
  /** The change request this message is about: its values are listed. */
  changeId?: string;
  /** The terms a request that is still waiting would touch. */
  proposal?: PlannedTerm[];
};

const selectForUpdate = {
  email: true,
  participantAccountId: true,
  participantAccount: { select: { email: true } },
  variableSymbol: true,
  bankAccountPrefix: true,
  bankAccountNumber: true,
  bankCode: true,
  paymentReminderAt: true,
  paymentToken: true,
  event: {
    select: {
      name: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      organization: { select: { name: true } },
    },
  },
  terms: {
    orderBy: [{ term: { startDate: 'asc' } }, { termId: 'asc' }],
    select: {
      termId: true,
      status: true,
      priceMinor: true,
      term: { select: { label: true, startDate: true, endDate: true } },
    },
  },
  payments: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, amountMinor: true, receivedOn: true },
  },
} satisfies Prisma.RegistrationSelect;

/**
 * Queues the participant e-mail of a saved event in the event's own
 * transaction, from the rows as they are right now. Returns false when the
 * same event was queued before. A missing detail the message needs throws, so
 * the whole event rolls back instead of sending something invented.
 */
export const queueParticipantUpdate = async (
  tx: Db,
  input: QueueUpdateInput,
): Promise<boolean> => {
  const row = await tx.registration.findUniqueOrThrow({
    where: { id: input.registrationId },
    select: selectForUpdate,
  });

  const terms: UpdateTerm[] = row.terms
    .filter((term) => term.status !== 'cancelled')
    .map((term) => ({
      label: term.term.label,
      startDate: fromDate(term.term.startDate),
      endDate: fromDate(term.term.endDate),
      status: term.status,
    }));
  const dueMinor = row.terms
    .filter((term) => term.status === 'confirmed')
    .reduce((sum, term) => sum + term.priceMinor, 0);
  const receivedMinor = row.payments.reduce(
    (sum, payment) => sum + payment.amountMinor,
    0,
  );

  let recorded: { amountMinor: number; receivedOn: string } | null = null;
  if (input.reason === 'paymentRecorded') {
    const payment = row.payments.find((p) => p.id === input.paymentId);
    if (!payment) {
      throw new Error(`Payment ${input.paymentId} is not on the registration`);
    }
    recorded = {
      amountMinor: payment.amountMinor,
      receivedOn: fromDate(payment.receivedOn),
    };
  }

  // Waiting terms are shown as such: nothing is promised before the decision.
  let proposedTerms: UpdateTerm[] | null = null;
  if (input.proposal) {
    const merged = new Map<string, UpdateTerm>(
      row.terms
        .filter((term) => term.status !== 'cancelled')
        .map((term) => [
          term.termId,
          {
            label: term.term.label,
            startDate: fromDate(term.term.startDate),
            endDate: fromDate(term.term.endDate),
            status: term.status,
          },
        ]),
    );
    for (const planned of input.proposal) {
      if (planned.proposed === null || planned.proposed === planned.original) {
        continue;
      }
      merged.set(planned.termId, {
        label: planned.label,
        startDate: planned.startDate,
        endDate: planned.endDate,
        status: planned.proposed === 'cancelled' ? 'cancelled' : 'pending',
      });
    }
    proposedTerms = [...merged.values()].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );
  }

  let changes: UpdateChange[] = [];
  if (input.changeId) {
    const change = await tx.registrationChange.findUniqueOrThrow({
      where: { id: input.changeId },
      select: { summary: true },
    });
    changes = changedValues(change.summary as unknown as ChangeSummary);
  }

  const contactEmail = row.event.contactEmail;
  // Free events have no account. Owing money without one is a defect: the
  // event rolls back instead of sending a message without payment details.
  const balanceMinor = dueMinor - receivedMinor;
  let bank: UpdatePayment['bank'] = null;
  if (row.bankAccountNumber !== null && row.bankCode !== null) {
    bank = {
      prefix: row.bankAccountPrefix,
      number: row.bankAccountNumber,
      bankCode: row.bankCode,
      variableSymbol: row.variableSymbol,
      reminderAt: row.paymentReminderAt?.toISOString() ?? null,
    };
  } else if (balanceMinor > 0) {
    throw new Error(
      `Registration ${input.registrationId} owes money but has no bank account`,
    );
  }

  const payload: ParticipantUpdatePayload = {
    reason: input.reason,
    eventName: row.event.name,
    organizer: {
      name: row.event.contactName ?? row.event.organization.name,
      email: contactEmail,
      phone: row.event.contactPhone,
    },
    terms,
    proposedTerms,
    changes,
    payment: {
      recorded,
      receivedMinor,
      balanceMinor,
      bank,
      paymentToken: row.paymentToken,
    },
    hasMagicLink:
      normalizeEmail(row.email) ===
      normalizeEmail(row.participantAccount.email),
  };

  const created = await tx.emailDelivery.createMany({
    data: [
      {
        type: 'participant_update',
        recipientEmail: row.email,
        registrationId: input.registrationId,
        participantAccountId: row.participantAccountId,
        payload: payload as unknown as Prisma.InputJsonValue,
        dedupKey: input.dedupKey,
      },
    ],
    skipDuplicates: true,
  });
  return created.count > 0;
};
