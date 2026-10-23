import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { fromDate } from '@/modules/events/domain/calendar-date';
import { ParticipantRegistrationModel } from '@/modules/registrations/domain/participant-registration';
import { Injectable } from '@nestjs/common';

const registrationSelect = {
  id: true,
  receivedAt: true,
  variableSymbol: true,
  bankAccountPrefix: true,
  bankAccountNumber: true,
  bankCode: true,
  paymentReminderAt: true,
  event: { select: { name: true, location: true } },
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
    orderBy: [{ receivedOn: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, receivedOn: true, amountMinor: true },
  },
} satisfies Prisma.RegistrationSelect;

const toModel = (
  row: Prisma.RegistrationGetPayload<{ select: typeof registrationSelect }>,
): ParticipantRegistrationModel =>
  new ParticipantRegistrationModel(
    row.id,
    row.receivedAt,
    row.event,
    row.terms.map((term) => ({
      termId: term.termId,
      label: term.term.label,
      startDate: fromDate(term.term.startDate),
      endDate: fromDate(term.term.endDate),
      priceMinor: term.priceMinor,
      status: term.status,
    })),
    row.variableSymbol,
    {
      prefix: row.bankAccountPrefix,
      number: row.bankAccountNumber,
      bankCode: row.bankCode,
    },
    row.paymentReminderAt,
    row.payments.map((payment) => ({
      id: payment.id,
      receivedOn: fromDate(payment.receivedOn),
      amountMinor: payment.amountMinor,
    })),
  );

/** Every read is bound to the verified account; there is no other filter. */
@Injectable()
export class ParticipantRegistrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first. */
  async findAll(accountId: string): Promise<ParticipantRegistrationModel[]> {
    const rows = await this.prisma.registration.findMany({
      where: { participantAccountId: accountId },
      orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
      select: registrationSelect,
    });
    return rows.map(toModel);
  }

  /** Null for a registration of another account, the same as a missing one. */
  async findOne(
    accountId: string,
    registrationId: string,
  ): Promise<ParticipantRegistrationModel | null> {
    const row = await this.prisma.registration.findFirst({
      where: { id: registrationId, participantAccountId: accountId },
      select: registrationSelect,
    });
    return row ? toModel(row) : null;
  }
}
