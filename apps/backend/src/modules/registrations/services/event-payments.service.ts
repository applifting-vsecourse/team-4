import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  EventPayments,
  eventPayments,
} from '@/modules/registrations/domain/event-payments';
import { EventRegistrationsRepository } from '@/modules/registrations/repositories/event-registrations.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class EventPaymentsService {
  constructor(private readonly registrations: EventRegistrationsRepository) {}

  /**
   * The received payments and balances of one event (S4-09). A foreign event
   * looks the same as a missing one (S2-03).
   */
  async overview(scope: EventScope): Promise<EventPayments> {
    const found = await this.registrations.findAll(scope, {});
    if (!found) throw new NotFoundException('Záznam není dostupný');
    return eventPayments(found.registrations);
  }
}
