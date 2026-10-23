import {
  PARTICIPANT_SESSION_COOKIE,
  ParticipantIdentity,
} from '@/modules/participant-access/domain/participant-access';
import {
  CurrentParticipant,
  ParticipantSessionGuard,
} from '@/modules/participant-access/guards/participant-session.guard';
import {
  ParticipantRegistrationDto,
  ParticipantRegistrationListDto,
} from '@/modules/registrations/dto/participant-registration.dto';
import { ParticipantRegistrationsService } from '@/modules/registrations/services/participant-registrations.service';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// The participant's own registrations (S2-14); S2-13 owns the session.
@ApiTags('participant registrations')
@ApiCookieAuth(PARTICIPANT_SESSION_COOKIE)
@Controller('participant/registrations')
@UseGuards(ParticipantSessionGuard)
export class ParticipantRegistrationsController {
  constructor(
    private readonly registrations: ParticipantRegistrationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'All registrations of the signed-in participant',
    description:
      'Read from the verified session only; no e-mail or id in the request ' +
      'can widen it. 401 `participant_session_required` without a session.',
  })
  @ApiResponse({ status: 200, type: ParticipantRegistrationListDto })
  async list(
    @CurrentParticipant() participant: ParticipantIdentity,
  ): Promise<ParticipantRegistrationListDto> {
    return ParticipantRegistrationListDto.from(
      await this.registrations.list(participant.accountId),
    );
  }

  @Get(':registrationId')
  @ApiOperation({
    summary: 'One own registration with its payments',
    description:
      '404 `registration_unavailable` for a registration of another ' +
      'participant, the same as a missing one.',
  })
  @ApiResponse({ status: 200, type: ParticipantRegistrationDto })
  async get(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
  ): Promise<ParticipantRegistrationDto> {
    return ParticipantRegistrationDto.from(
      await this.registrations.get(participant.accountId, registrationId),
    );
  }
}
