import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  MAX_STATEMENT_BYTES,
  parseStatement,
} from '@/modules/payments/domain/bank-statement';
import {
  BankTransactionModel,
  ManualPairingInput,
  StatementImportModel,
} from '@/modules/payments/domain/bank-transaction';
import { pairByVariableSymbol } from '@/modules/payments/domain/pairing';
import { BankTransactionsRepository } from '@/modules/payments/repositories/bank-transactions.repository';
import { ParticipantUpdateService } from '@/modules/registrations/services/participant-update.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

@Injectable()
export class BankTransactionsService {
  constructor(
    private readonly repository: BankTransactionsRepository,
    private readonly updates: ParticipantUpdateService,
  ) {}

  /**
   * The event's queue of unpaired transactions (F24). A foreign event looks
   * the same as a missing one (S2-03).
   */
  async listUnpaired(scope: EventScope): Promise<BankTransactionModel[]> {
    if (!(await this.repository.isOwnEvent(scope))) throw notAvailable();
    return this.repository.listUnpaired(scope);
  }

  /**
   * Imports a statement into the event: all its incoming movements or, when
   * any movement is invalid, none of them. Importing the same statement again
   * adds nothing. The event's unpaired transactions are then paired by their
   * variable symbol (F24); the rest stay in the queue.
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
      paired: await this.pairQueue(scope),
    };
  }

  /**
   * Credits a queued transaction to a registration of the same event, with
   * the organizer's reason (F24). 404 for a foreign or missing event or
   * transaction; a registration of another event is refused even when asked
   * for directly; a transaction is credited at most once.
   */
  async pairManually(
    scope: EventScope,
    transactionId: string,
    input: ManualPairingInput,
  ): Promise<void> {
    const outcome = await this.repository.pair(
      scope,
      transactionId,
      input.registrationId,
      { recordedById: scope.ownerId, reason: input.reason.trim() },
    );
    if (outcome === 'transaction_not_found') throw notAvailable();
    if (outcome === 'registration_unavailable') {
      throw new BadRequestException({
        statusCode: 400,
        code: 'registration_unavailable',
        field: 'registrationId',
        message: 'Vyberte přihlášku této akce.',
      });
    }
    if (outcome === 'already_paired') {
      throw new ConflictException({
        statusCode: 409,
        code: 'transaction_already_paired',
        message: 'Transakce už je přiřazená k přihlášce. Načtěte frontu znovu.',
      });
    }
    this.updates.dispatch(input.registrationId);
  }

  /** Pairs what the variable symbols decide; returns how many were paired. */
  private async pairQueue(scope: EventScope): Promise<number> {
    const { transactions, candidates } =
      await this.repository.pairingInputs(scope);
    let paired = 0;
    const registrations = new Set<string>();
    for (const pairing of pairByVariableSymbol(transactions, candidates)) {
      const outcome = await this.repository.pair(
        scope,
        pairing.transactionId,
        pairing.registrationId,
        null,
      );
      if (outcome !== 'paired') continue;
      paired += 1;
      registrations.add(pairing.registrationId);
    }
    for (const registrationId of registrations) {
      this.updates.dispatch(registrationId);
    }
    return paired;
  }
}
