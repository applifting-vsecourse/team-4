import { ParticipantIdentity } from '@/modules/participant-access/domain/participant-access';
import {
  ParticipantProfile,
  ParticipantProfileValues,
} from '@/modules/participant-profile/domain/participant-profile';
import { ParticipantProfileRepository } from '@/modules/participant-profile/repositories/participant-profile.repository';
import { Injectable } from '@nestjs/common';

/** Every read and write is bound to the account of the verified session. */
@Injectable()
export class ParticipantProfileService {
  constructor(private readonly repository: ParticipantProfileRepository) {}

  read(participant: ParticipantIdentity): Promise<ParticipantProfile> {
    return this.repository.find(participant.accountId);
  }

  save(
    participant: ParticipantIdentity,
    values: ParticipantProfileValues,
  ): Promise<ParticipantProfile> {
    return this.repository.save(participant.accountId, values);
  }
}
