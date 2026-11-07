import { MoveRefusal } from '@/modules/accommodation/domain/term-order';
import {
  MoveInput,
  MoveRecord,
  OrderMovesRepository,
} from '@/modules/accommodation/repositories/order-moves.repository';
import {
  TermEvaluation,
  TermEvaluationService,
} from '@/modules/accommodation/services/term-evaluation.service';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

const REFUSALS: Record<MoveRefusal, () => Error> = {
  person_not_movable: () =>
    new BadRequestException({
      statusCode: 400,
      code: 'person_not_movable',
      field: 'registrationId',
      message:
        'Přesunout lze jen nepotvrzenou osobu fronty, které je ubytování určené.',
    }),
  target_invalid: () =>
    new BadRequestException({
      statusCode: 400,
      code: 'target_invalid',
      field: 'targetId',
      message: 'Vyberte jinou nepotvrzenou osobu téže fronty.',
    }),
  order_unchanged: () =>
    new BadRequestException({
      statusCode: 400,
      code: 'order_unchanged',
      field: 'targetId',
      message: 'Osoba už na tomto místě stojí. Pořadí by se nezměnilo.',
    }),
};

/**
 * The manual order of a term's queue (S3-03, F39-1, spec v4 §6): a move of
 * an unconfirmed person with its audit. A move changes priority only; it
 * confirms nobody, creates no debt and releases no confirmed place.
 */
@Injectable()
export class OrderMovesService {
  constructor(
    private readonly repository: OrderMovesRepository,
    private readonly evaluation: TermEvaluationService,
  ) {}

  /** The term as it is after the move. */
  async move(
    scope: EventScope,
    termId: string,
    input: Omit<MoveInput, 'actorId'>,
  ): Promise<TermEvaluation> {
    const outcome = await this.repository.move(scope, termId, {
      ...input,
      actorId: scope.ownerId,
    });
    if (outcome.kind === 'not_found') throw notAvailable();
    if (outcome.kind === 'stale') {
      throw new ConflictException({
        statusCode: 409,
        code: 'order_stale',
        message:
          'Fronta se mezitím změnila. Načtěte ji znovu a přesun zopakujte.',
      });
    }
    if (outcome.kind === 'refused') throw REFUSALS[outcome.refusal]();
    return this.evaluation.term(scope, termId);
  }

  async moves(scope: EventScope, termId: string): Promise<MoveRecord[]> {
    const moves = await this.repository.findForTerm(scope, termId);
    if (!moves) throw notAvailable();
    return moves;
  }
}
