import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  ManagedRegistrationModel,
  RegistrationFilter,
  RegistrationList,
} from '@/modules/registrations/domain/managed-registration';
import { EventRegistrationsRepository } from '@/modules/registrations/repositories/event-registrations.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

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
}
