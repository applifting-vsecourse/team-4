import { ParticipantTermPlacement } from '@/modules/accommodation/domain/participant-placements';
import { ParticipantPlacementsRepository } from '@/modules/accommodation/repositories/participant-placements.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

/** The own published room placements of a participant (S4-02, #341). */
@Injectable()
export class ParticipantPlacementsService {
  constructor(private readonly repository: ParticipantPlacementsRepository) {}

  async forParticipant(
    accountId: string,
    registrationId: string,
  ): Promise<ParticipantTermPlacement[]> {
    const terms = await this.repository.find(accountId, registrationId);
    if (!terms) {
      // Another participant's registration reads as a missing one.
      throw new NotFoundException({
        statusCode: 404,
        code: 'registration_unavailable',
        message: 'Přihláška není dostupná.',
      });
    }
    return terms;
  }
}
