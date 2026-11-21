import {
  PARTICIPANT_SESSION_COOKIE,
  ParticipantIdentity,
} from '@/modules/participant-access/domain/participant-access';
import {
  CurrentParticipant,
  ParticipantSessionGuard,
} from '@/modules/participant-access/guards/participant-session.guard';
import {
  RoommateWishesDto,
  SaveRoommateWishesDto,
} from '@/modules/registrations/dto/roommate-wishes.dto';
import { RoommateWishesService } from '@/modules/registrations/services/roommate-wishes.service';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// Přání na spolubydlící (S4-05, #339) of the participant's own registration.
@ApiTags('participant registrations')
@ApiCookieAuth(PARTICIPANT_SESSION_COOKIE)
@Controller('participant/registrations/:registrationId/roommate-wishes')
@UseGuards(ParticipantSessionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ParticipantRoommateWishesController {
  constructor(private readonly wishes: RoommateWishesService) {}

  @Get()
  @ApiOperation({
    summary: 'The roommate wishes and who can be chosen',
    description:
      'Only for a registration confirmed in at least one term. 404 ' +
      '`roommate_wishes_unavailable` otherwise and for another ' +
      'participant’s registration, the same as a missing one.',
  })
  async get(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
  ): Promise<RoommateWishesDto> {
    return RoommateWishesDto.from(
      await this.wishes.forParticipant(participant.accountId, registrationId),
    );
  }

  @Put()
  @ApiOperation({
    summary: 'Replaces the roommate wishes',
    description:
      'Stored at once, without the organizer’s approval; the wish is ' +
      'one-sided and for the whole event. 400 `roommate_invalid` for the ' +
      'author, a repeat or someone who is neither a candidate nor already ' +
      'wished for; nothing is stored then. 404 as for reading.',
  })
  async save(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body() body: SaveRoommateWishesDto,
  ): Promise<RoommateWishesDto> {
    return RoommateWishesDto.from(
      await this.wishes.save(
        participant.accountId,
        registrationId,
        body.registrationIds,
      ),
    );
  }
}
