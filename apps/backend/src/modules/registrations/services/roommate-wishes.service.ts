import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  Roommate,
  RoommateWishes,
} from '@/modules/registrations/domain/roommate-wish';
import { RoommateWishesRepository } from '@/modules/registrations/repositories/roommate-wishes.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/** Another participant's registration, a waitlisted one and a missing one look the same. */
const unavailable = (): NotFoundException =>
  new NotFoundException({
    statusCode: 404,
    code: 'roommate_wishes_unavailable',
    message: 'Přání na spolubydlící nejsou dostupná.',
  });

/**
 * Přání na spolubydlící (S4-05, #339): the participant's own list, stored
 * at once without the organizer's approval; the organizer reads it.
 */
@Injectable()
export class RoommateWishesService {
  constructor(private readonly repository: RoommateWishesRepository) {}

  async forParticipant(
    accountId: string,
    registrationId: string,
  ): Promise<RoommateWishes> {
    const wishes = await this.repository.findForParticipant(
      accountId,
      registrationId,
    );
    if (!wishes) throw unavailable();
    return wishes;
  }

  /** The whole list replaces the stored one; an empty list removes every wish. */
  async save(
    accountId: string,
    registrationId: string,
    registrationIds: readonly string[],
  ): Promise<RoommateWishes> {
    const saved = await this.repository.replaceForParticipant(
      accountId,
      registrationId,
      registrationIds,
    );
    if (!saved) throw unavailable();
    if (saved.result === 'invalid')
      throw new BadRequestException({
        statusCode: 400,
        code: 'roommate_invalid',
        message: saved.message,
      });
    return saved.wishes;
  }

  async forOrganizer(
    scope: EventScope,
    registrationId: string,
  ): Promise<Roommate[]> {
    const wishes = await this.repository.findForOrganizer(
      scope,
      registrationId,
    );
    if (!wishes) throw new NotFoundException('Záznam není dostupný');
    return wishes;
  }
}
