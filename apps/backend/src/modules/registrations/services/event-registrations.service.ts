import { EventScope } from '@/modules/events/repositories/events.repository';
import { GenderAnswer } from '@/modules/registrations/domain/gender';
import {
  ManagedRegistrationModel,
  RegistrationFilter,
  RegistrationList,
} from '@/modules/registrations/domain/managed-registration';
import { EventRegistrationsRepository } from '@/modules/registrations/repositories/event-registrations.repository';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

@Injectable()
export class EventRegistrationsService {
  constructor(private readonly repository: EventRegistrationsRepository) {}

  /**
   * Registrations of one event, oldest first. A foreign event looks the same
   * as a missing one (S2-03); a term of another event simply matches nothing.
   */
  async list(
    scope: EventScope,
    filter: RegistrationFilter,
  ): Promise<RegistrationList> {
    const found = await this.repository.findAll(scope, filter);
    if (!found) throw notAvailable();
    // Events hold hundreds of registrations at most (data-model.md §3.9).
    return filter.payment
      ? {
          total: found.total,
          registrations: found.registrations.filter(
            (registration) => registration.paymentState === filter.payment,
          ),
        }
      : found;
  }

  async get(
    scope: EventScope,
    registrationId: string,
  ): Promise<ManagedRegistrationModel> {
    const registration = await this.repository.findOne(scope, registrationId);
    if (!registration) throw notAvailable();
    return registration;
  }

  /** The organizer's correction of the gender answer (F64); the saved registration. */
  async updateGender(
    scope: EventScope,
    registrationId: string,
    answer: GenderAnswer,
  ): Promise<ManagedRegistrationModel> {
    const outcome = await this.repository.updateGender(
      scope,
      registrationId,
      answer,
    );
    if (outcome === 'not_found') throw notAvailable();
    if (outcome === 'change_pending') {
      throw new ConflictException({
        statusCode: 409,
        code: 'change_pending',
        message:
          'Přihláška má nevyřízenou žádost o změnu. Nejdřív o ní rozhodněte.',
      });
    }
    return this.get(scope, registrationId);
  }
}
