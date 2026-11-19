import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { fromDate, toDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { StatementTransaction } from '@/modules/payments/domain/bank-statement';
import { BankTransactionModel } from '@/modules/payments/domain/bank-transaction';
import {
  PairingCandidate,
  UnpairedTransaction,
} from '@/modules/payments/domain/pairing';
import { queueParticipantUpdate } from '@/modules/registrations/repositories/participant-update-queue';
import { isUniqueViolation } from '@/modules/rooms/repositories/rooms.repository';
import { Injectable } from '@nestjs/common';

const ownEvent = (scope: EventScope): Prisma.EventWhereInput => ({
  id: scope.eventId,
  organizationId: scope.organizationId,
  organization: { ownerId: scope.ownerId },
});

@Injectable()
export class BankTransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isOwnEvent(scope: EventScope): Promise<boolean> {
    const event = await this.prisma.event.findFirst({
      where: ownEvent(scope),
      select: { id: true },
    });
    return event !== null;
  }

  /**
   * The event's queue (F24): transactions not paired with any registration,
   * newest first; the scope is checked in the same query.
   */
  async listUnpaired(scope: EventScope): Promise<BankTransactionModel[]> {
    const rows = await this.prisma.bankTransaction.findMany({
      where: { eventId: scope.eventId, event: ownEvent(scope), payment: null },
      orderBy: [{ bookedOn: 'desc' }, { bankTransactionId: 'desc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      bankTransactionId: row.bankTransactionId,
      bookedOn: fromDate(row.bookedOn),
      amountMinor: row.amountMinor,
      variableSymbol: row.variableSymbol,
      counterpartyAccount: row.counterpartyAccount,
      counterpartyName: row.counterpartyName,
      message: row.message,
      importedAt: row.importedAt,
    }));
  }

  /**
   * Stores the movements new to the event in one statement and returns how
   * many there were. A movement already imported, also by a concurrent
   * import, is skipped by the unique index, never stored twice.
   */
  async insertNew(
    scope: EventScope,
    transactions: StatementTransaction[],
  ): Promise<number> {
    if (!transactions.length) return 0;
    const { count } = await this.prisma.bankTransaction.createMany({
      data: transactions.map((transaction) => ({
        organizationId: scope.organizationId,
        eventId: scope.eventId,
        importedById: scope.ownerId,
        bankTransactionId: transaction.bankTransactionId,
        bookedOn: toDate(transaction.bookedOn),
        amountMinor: transaction.amountMinor,
        variableSymbol: transaction.variableSymbol,
        counterpartyAccount: transaction.counterpartyAccount,
        counterpartyName: transaction.counterpartyName,
        message: transaction.message,
      })),
      skipDuplicates: true,
    });
    return count;
  }

  /** The unpaired transactions of the event and its registrations, by symbol. */
  async pairingInputs(scope: EventScope): Promise<{
    transactions: UnpairedTransaction[];
    candidates: PairingCandidate[];
  }> {
    const [transactions, candidates] = await this.prisma.$transaction([
      this.prisma.bankTransaction.findMany({
        where: {
          eventId: scope.eventId,
          event: ownEvent(scope),
          payment: null,
        },
        orderBy: [{ bookedOn: 'asc' }, { bankTransactionId: 'asc' }],
        select: { id: true, variableSymbol: true },
      }),
      this.prisma.registration.findMany({
        where: {
          eventId: scope.eventId,
          organizationId: scope.organizationId,
          event: ownEvent(scope),
        },
        select: { id: true, variableSymbol: true },
      }),
    ]);
    return { transactions, candidates };
  }

  /**
   * Credits the transaction to a registration of its own event as a received
   * payment, and queues the participant's update about it in the same
   * database transaction: the stored event of a received payment (S4-06).
   * A transaction already paired, also by a concurrent request, is credited
   * at most once; the unique index decides.
   */
  async pair(
    scope: EventScope,
    transactionId: string,
    registrationId: string,
    manual: { recordedById: string; reason: string } | null,
  ): Promise<PairingOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const transaction = await tx.bankTransaction.findFirst({
          where: {
            id: transactionId,
            eventId: scope.eventId,
            event: ownEvent(scope),
          },
          select: {
            amountMinor: true,
            bookedOn: true,
            payment: { select: { id: true } },
          },
        });
        if (!transaction) return 'transaction_not_found';
        if (transaction.payment) return 'already_paired';
        const registration = await tx.registration.findFirst({
          where: {
            id: registrationId,
            eventId: scope.eventId,
            organizationId: scope.organizationId,
          },
          select: { id: true },
        });
        if (!registration) return 'registration_unavailable';
        const payment = await tx.payment.create({
          data: {
            organizationId: scope.organizationId,
            registrationId,
            submissionKey: randomUUID(),
            amountMinor: transaction.amountMinor,
            receivedOn: transaction.bookedOn,
            source: 'bank_transfer',
            bankTransactionId: transactionId,
            recordedById: manual?.recordedById ?? null,
            assignmentReason: manual?.reason ?? null,
          },
          select: { id: true },
        });
        await queueParticipantUpdate(tx, {
          registrationId,
          reason: 'paymentRecorded',
          dedupKey: `payment:${payment.id}`,
          paymentId: payment.id,
        });
        return 'paired';
      });
    } catch (error) {
      if (isUniqueViolation(error)) return 'already_paired';
      throw error;
    }
  }
}

export type PairingOutcome =
  | 'paired'
  | 'already_paired'
  | 'transaction_not_found'
  | 'registration_unavailable';
