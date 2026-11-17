import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  MAX_STATEMENT_BYTES,
  parseStatement,
} from '@/modules/payments/domain/bank-statement';
import {
  BankTransactionModel,
  StatementImportModel,
} from '@/modules/payments/domain/bank-transaction';
import { BankTransactionsRepository } from '@/modules/payments/repositories/bank-transactions.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

@Injectable()
export class BankTransactionsService {
  constructor(private readonly repository: BankTransactionsRepository) {}

  /** A foreign event looks the same as a missing one (S2-03). */
  async list(scope: EventScope): Promise<BankTransactionModel[]> {
    if (!(await this.repository.isOwnEvent(scope))) throw notAvailable();
    return this.repository.list(scope);
  }

  /**
   * Imports a statement into the event: all its incoming movements or, when
   * any movement is invalid, none of them. Importing the same statement again
   * adds nothing. Payments and balances stay unchanged.
   */
  async import(
    scope: EventScope,
    bytes: Uint8Array,
  ): Promise<StatementImportModel> {
    if (!(await this.repository.isOwnEvent(scope))) throw notAvailable();
    if (bytes.byteLength > MAX_STATEMENT_BYTES) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'statement_too_large',
        message: 'Výpis může mít nejvýše 2 MB.',
      });
    }
    const result = parseStatement(bytes);
    if (!result.ok) {
      throw new BadRequestException({ statusCode: 400, ...result.error });
    }
    const { transactions, skippedOutgoing } = result.statement;
    const imported = await this.repository.insertNew(scope, transactions);
    return {
      received: transactions.length,
      imported,
      duplicates: transactions.length - imported,
      skippedOutgoing,
    };
  }
}
