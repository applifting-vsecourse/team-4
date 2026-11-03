import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  isCalendarDate,
  isWithinTerm,
  ProgrammeItemInput,
  ProgrammeItemModel,
  ProgrammeTerm,
} from '@/modules/programme/domain/programme-item';
import { ProgrammeRepository } from '@/modules/programme/repositories/programme.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// A foreign term, a foreign event and a missing one look the same (S2-03).
const notAvailable = (): NotFoundException =>
  new NotFoundException({
    statusCode: 404,
    code: 'programme_unavailable',
    message: 'Program není dostupný.',
  });

const dateOutOfTerm = (): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    code: 'programme_date_out_of_term',
    field: 'startDate',
    message: 'Datum musí ležet v rozsahu termínu.',
  });

const dateInvalid = (): BadRequestException =>
  new BadRequestException({
    statusCode: 400,
    code: 'programme_date_invalid',
    field: 'startDate',
    message: 'Zadejte platné datum.',
  });

/**
 * The programme of a term (F65). It never touches participation, capacity,
 * price or payments, and it stays editable in a locked event: it is not one of
 * the locked fields.
 */
@Injectable()
export class ProgrammeService {
  constructor(private readonly repository: ProgrammeRepository) {}

  async list(scope: EventScope, termId: string): Promise<ProgrammeItemModel[]> {
    await this.requireTerm(scope, termId);
    return this.repository.list(termId);
  }

  async add(
    scope: EventScope,
    termId: string,
    input: ProgrammeItemInput,
  ): Promise<ProgrammeItemModel[]> {
    await this.requireValidInput(scope, termId, input);
    await this.repository.insert(scope.eventId, termId, input);
    return this.repository.list(termId);
  }

  async update(
    scope: EventScope,
    termId: string,
    itemId: string,
    input: ProgrammeItemInput,
  ): Promise<ProgrammeItemModel[]> {
    await this.requireValidInput(scope, termId, input);
    if (!(await this.repository.update(termId, itemId, input))) {
      throw notAvailable();
    }
    return this.repository.list(termId);
  }

  async remove(
    scope: EventScope,
    termId: string,
    itemId: string,
  ): Promise<ProgrammeItemModel[]> {
    await this.requireTerm(scope, termId);
    if (!(await this.repository.delete(termId, itemId))) throw notAvailable();
    return this.repository.list(termId);
  }

  /** Read by the confirmed participant; evaluated against the current state. */
  async listForParticipant(
    accountId: string,
    registrationId: string,
    termId: string,
  ): Promise<ProgrammeItemModel[]> {
    const items = await this.repository.listForConfirmed(
      accountId,
      registrationId,
      termId,
    );
    if (!items) throw notAvailable();
    return items;
  }

  private async requireTerm(
    scope: EventScope,
    termId: string,
  ): Promise<ProgrammeTerm> {
    const term = await this.repository.findOrganizerTerm(scope, termId);
    if (!term) throw notAvailable();
    return term;
  }

  private async requireValidInput(
    scope: EventScope,
    termId: string,
    input: ProgrammeItemInput,
  ): Promise<void> {
    const term = await this.requireTerm(scope, termId);
    if (!isCalendarDate(input.startDate)) throw dateInvalid();
    if (!isWithinTerm(input.startDate, term)) throw dateOutOfTerm();
  }
}
