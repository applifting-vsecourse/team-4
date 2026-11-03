import { ParticipantRegistrationModel } from '@/modules/registrations/domain/participant-registration';
import { EventTermInfo } from '@/modules/registrations/domain/registration-change';
import { ParticipantRegistrationsRepository } from '@/modules/registrations/repositories/participant-registrations.repository';
import { RegistrationChangesRepository } from '@/modules/registrations/repositories/registration-changes.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ParticipantRegistrationsService {
  constructor(
    private readonly repository: ParticipantRegistrationsRepository,
    private readonly changes: RegistrationChangesRepository,
  ) {}

  /** Terms of the registration's event, for moving to another. */
  availableTerms(
    registrationId: string,
  ): Promise<(EventTermInfo & { isFull: boolean })[]> {
    return this.changes.availableTerms(registrationId);
  }

  list(accountId: string): Promise<ParticipantRegistrationModel[]> {
    return this.repository.findAll(accountId);
  }

  /** Another account's registration looks the same as a missing one. */
  async get(
    accountId: string,
    registrationId: string,
  ): Promise<ParticipantRegistrationModel> {
    const registration = await this.repository.findOne(
      accountId,
      registrationId,
    );
    if (!registration) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'registration_unavailable',
        message: 'Přihláška není dostupná.',
      });
    }
    return registration;
  }
}
