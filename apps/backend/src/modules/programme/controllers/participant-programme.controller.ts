import {
  PARTICIPANT_SESSION_COOKIE,
  ParticipantIdentity,
} from '@/modules/participant-access/domain/participant-access';
import {
  CurrentParticipant,
  ParticipantSessionGuard,
} from '@/modules/participant-access/guards/participant-session.guard';
import { ProgrammeDto } from '@/modules/programme/dto/programme.dto';
import { ProgrammeService } from '@/modules/programme/services/programme.service';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// Participant side of the term programme (F65): read only.
@ApiTags('participant programme')
@ApiCookieAuth(PARTICIPANT_SESSION_COOKIE)
@Controller('participant/registrations/:registrationId/terms/:termId/programme')
@UseGuards(ParticipantSessionGuard)
export class ParticipantProgrammeController {
  constructor(private readonly programme: ProgrammeService) {}

  @Get()
  @ApiOperation({
    summary: 'Programme of a term the participant is confirmed in',
    description:
      'Read from the verified session and the stored status at the time of ' +
      'the request. 404 `programme_unavailable` for a waitlisted term, a ' +
      'term outside the registration or another participant’s registration, ' +
      'all the same as a missing one.',
  })
  async get(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<ProgrammeDto> {
    return ProgrammeDto.from(
      await this.programme.listForParticipant(
        participant.accountId,
        registrationId,
        termId,
      ),
    );
  }
}
