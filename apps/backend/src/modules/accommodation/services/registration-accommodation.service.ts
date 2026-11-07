import { DeterminationRefusal } from '@/modules/accommodation/domain/determination';
import {
  RegistrationAccommodation,
  RegistrationAccommodationRepository,
} from '@/modules/accommodation/repositories/registration-accommodation.repository';
import {
  DecisionRecord,
  TermDecisionRepository,
} from '@/modules/accommodation/repositories/term-decision.repository';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

const REFUSALS: Record<DeterminationRefusal, () => Error> = {
  no_hard_attribute: () =>
    new ConflictException({
      statusCode: 409,
      code: 'no_hard_attribute',
      message: 'Akce nemá pravidlo, podle kterého se ubytování určuje.',
    }),
  determination_not_needed: () =>
    new ConflictException({
      statusCode: 409,
      code: 'determination_not_needed',
      message: 'Odpověď účastníka už ubytování určuje.',
    }),
  value_invalid: () =>
    new BadRequestException({
      statusCode: 400,
      code: 'value_invalid',
      field: 'value',
      message: 'Vyberte jednu z nabízených hodnot.',
    }),
};

/**
 * The accommodation of one registration as its organizer sees it (S3-01,
 * spec v4 §4): the answer to the hard attribute, the determination and its
 * history, and determining the effective value.
 */
@Injectable()
export class RegistrationAccommodationService {
  constructor(
    private readonly repository: RegistrationAccommodationRepository,
    private readonly decisions: TermDecisionRepository,
  ) {}

  async get(
    scope: EventScope,
    registrationId: string,
  ): Promise<RegistrationAccommodation & { decisions: DecisionRecord[] }> {
    const [accommodation, decisions] = await Promise.all([
      this.repository.find(scope, registrationId),
      this.decisions.history(scope, registrationId),
    ]);
    if (!accommodation || !decisions) throw notAvailable();
    return { ...accommodation, decisions };
  }

  /** The original answer stays; nothing is confirmed, owed or sent. */
  async determine(
    scope: EventScope,
    registrationId: string,
    input: { value: string; reason: string; answer: string | null },
  ): Promise<RegistrationAccommodation & { decisions: DecisionRecord[] }> {
    const outcome = await this.repository.determine(scope, registrationId, {
      ...input,
      actorId: scope.ownerId,
    });
    if (outcome.kind === 'not_found') throw notAvailable();
    if (outcome.kind === 'answer_changed') {
      throw new ConflictException({
        statusCode: 409,
        code: 'answer_changed',
        message: 'Účastník mezitím změnil odpověď. Načtěte ji znovu.',
      });
    }
    if (outcome.kind === 'refused') throw REFUSALS[outcome.refusal]();
    return this.get(scope, registrationId);
  }
}
