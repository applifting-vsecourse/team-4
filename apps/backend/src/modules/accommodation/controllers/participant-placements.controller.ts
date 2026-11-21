import { ParticipantRoomPlacementsDto } from '@/modules/accommodation/dto/participant-placements.dto';
import { ParticipantPlacementsService } from '@/modules/accommodation/services/participant-placements.service';
import {
  PARTICIPANT_SESSION_COOKIE,
  ParticipantIdentity,
} from '@/modules/participant-access/domain/participant-access';
import {
  CurrentParticipant,
  ParticipantSessionGuard,
} from '@/modules/participant-access/guards/participant-session.guard';
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

// Moje přihlášky → Detail přihlášky → Ubytování (S4-02, #341): the own room
// and own roommate wishes of each confirmed term, once its rooms are
// published.
@ApiTags('participant registrations')
@ApiCookieAuth(PARTICIPANT_SESSION_COOKIE)
@Controller('participant/registrations/:registrationId/room-placements')
@UseGuards(ParticipantSessionGuard)
export class ParticipantPlacementsController {
  constructor(private readonly placements: ParticipantPlacementsService) {}

  @Get()
  @ApiResponse({ status: 200, type: ParticipantRoomPlacementsDto })
  @ApiOperation({
    summary: 'The own room and wish states of each confirmed term',
    description:
      'A term whose rooms are not published carries neither room nor ' +
      'wishes. 404 `registration_unavailable` for another participant’s ' +
      'registration, the same as a missing one.',
  })
  async get(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
  ): Promise<ParticipantRoomPlacementsDto> {
    return ParticipantRoomPlacementsDto.from(
      await this.placements.forParticipant(
        participant.accountId,
        registrationId,
      ),
    );
  }
}
