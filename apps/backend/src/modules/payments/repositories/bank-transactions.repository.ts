import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { fromDate, toDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { StatementTransaction } from '@/modules/payments/domain/bank-statement';
import { BankTransactionModel } from '@/modules/payments/domain/bank-transaction';
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

  /** Newest first; the scope is checked in the same query. */
  async list(scope: EventScope): Promise<BankTransactionModel[]> {
    const rows = await this.prisma.bankTransaction.findMany({
      where: { eventId: scope.eventId, event: ownEvent(scope) },
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
}
