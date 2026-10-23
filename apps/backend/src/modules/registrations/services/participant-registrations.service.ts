import { ParticipantRegistrationModel } from '@/modules/registrations/domain/participant-registration';
import { ParticipantRegistrationsRepository } from '@/modules/registrations/repositories/participant-registrations.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ParticipantRegistrationsService {
  constructor(
    private readonly repository: ParticipantRegistrationsRepository,
  ) {}

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
