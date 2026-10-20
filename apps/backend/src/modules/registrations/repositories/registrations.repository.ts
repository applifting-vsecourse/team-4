import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { fromDate } from '@/modules/events/domain/calendar-date';
import {
  decideParticipation,
  normalizeEmail,
  RegistrationInput,
  RegistrationResultModel,
} from '@/modules/registrations/domain/registration';
import {
  termsWithBeds,
  toTermCapacity,
} from '@/modules/rooms/repositories/rooms.repository';
import { Injectable } from '@nestjs/common';

const resultSelect = {
  id: true,
  receivedAt: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  terms: {
    orderBy: [{ term: { startDate: 'asc' } }, { termId: 'asc' }],
    select: {
      termId: true,
      status: true,
      priceMinor: true,
      term: { select: { label: true, startDate: true, endDate: true } },
    },
  },
} satisfies Prisma.RegistrationSelect;

const toResult = (
  row: Prisma.RegistrationGetPayload<{ select: typeof resultSelect }>,
): RegistrationResultModel =>
  new RegistrationResultModel(
    row.id,
    row.receivedAt,
    row.firstName,
    row.lastName,
    row.email,
    row.phone,
    row.terms.map((term) => ({
      termId: term.termId,
      label: term.term.label,
      startDate: fromDate(term.term.startDate),
      endDate: fromDate(term.term.endDate),
      priceMinor: term.priceMinor,
      status: term.status,
    })),
  );

export type StoredSubmission = {
  /** Public link of the event the key was used for. */
  publicId: string;
  payloadHash: string;
  result: RegistrationResultModel;
};

export type SubmitOutcome =
  | { kind: 'created'; result: RegistrationResultModel }
  /** Unknown link, or an event that is not open: the same to the visitor. */
  | { kind: 'event_unavailable' }
  | { kind: 'term_unknown' };

type OpenEventRow = {
  id: string;
  organizationId: string;
  bankAccountPrefix: string | null;
  bankAccountNumber: string | null;
  bankCode: string | null;
  paymentDueDays: number | null;
};

@Injectable()
export class RegistrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySubmissionKey(
    submissionKey: string,
  ): Promise<StoredSubmission | null> {
    const row = await this.prisma.registration.findUnique({
      where: { submissionKey },
      select: {
        ...resultSelect,
        payloadHash: true,
        event: { select: { publicId: true } },
      },
    });
    if (!row) return null;
    return {
      publicId: row.event.publicId,
      payloadHash: row.payloadHash,
      result: toResult(row),
    };
  }

  /**
   * Saves the registration, the decision for each term and the queued
   * confirmation e-mail in one transaction (data-model.md §3.6, §3.7).
   *
   * The event row is share-locked, so it cannot leave `open` meanwhile; the
   * selected terms are then locked in id order, the serialization point shared
   * with room changes. A concurrent submit for the same term waits here and
   * sees this one's confirmation. A second registration of the e-mail, or a
   * concurrent one with the same key, fails on a unique index and rolls back.
   */
  async submit(
    publicId: string,
    input: RegistrationInput,
    payloadHash: string,
  ): Promise<SubmitOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const [event] = await tx.$queryRaw<OpenEventRow[]>`
        SELECT "id", "organizationId", "bankAccountPrefix", "bankAccountNumber",
               "bankCode", "paymentDueDays"
        FROM "event"
        WHERE "publicId" = ${publicId} AND "status" = 'open'
        FOR SHARE`;
      if (!event) return { kind: 'event_unavailable' };
      // Opening requires them (S2-06) and S2-09 keeps them valid afterwards.
      if (
        event.bankAccountNumber === null ||
        event.bankCode === null ||
        event.paymentDueDays === null
      ) {
        throw new Error(`Open event ${event.id} has no payment settings`);
      }

      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "event_term"
        WHERE "eventId" = ${event.id}::uuid
          AND "id" = ANY(${input.termIds}::uuid[])
        ORDER BY "id" FOR UPDATE`;
      if (locked.length !== input.termIds.length) {
        return { kind: 'term_unknown' };
      }

      const terms = await tx.eventTerm.findMany({
        where: { eventId: event.id, id: { in: input.termIds } },
        orderBy: termsWithBeds.orderBy,
        select: { ...termsWithBeds.select, priceMinor: true },
      });

      // ON CONFLICT DO NOTHING: a concurrent first registration of the same
      // e-mail elsewhere cannot fail this one.
      const email = normalizeEmail(input.email);
      await tx.participantAccount.createMany({
        data: [{ email }],
        skipDuplicates: true,
      });
      const account = await tx.participantAccount.findUniqueOrThrow({
        where: { email },
        select: { id: true },
      });

      const registration = await tx.registration.create({
        data: {
          organizationId: event.organizationId,
          eventId: event.id,
          participantAccountId: account.id,
          submissionKey: input.submissionKey,
          payloadHash,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          bankAccountPrefix: event.bankAccountPrefix,
          bankAccountNumber: event.bankAccountNumber,
          bankCode: event.bankCode,
          paymentDueDays: event.paymentDueDays,
        },
        select: { id: true },
      });

      const decidedAt = new Date();
      await tx.registrationTerm.createMany({
        data: terms.map((term) => ({
          registrationId: registration.id,
          termId: term.id,
          eventId: event.id,
          status: decideParticipation(toTermCapacity(term)),
          priceMinor: term.priceMinor,
          decidedAt,
        })),
      });

      await tx.emailDelivery.create({
        data: {
          type: 'registration_confirmation',
          recipientEmail: input.email,
          registrationId: registration.id,
          participantAccountId: account.id,
        },
      });

      const saved = await tx.registration.findUniqueOrThrow({
        where: { id: registration.id },
        select: resultSelect,
      });
      return { kind: 'created', result: toResult(saved) };
    });
  }
}
