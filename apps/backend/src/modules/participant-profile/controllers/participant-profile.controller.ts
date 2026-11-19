import {
  PARTICIPANT_SESSION_COOKIE,
  ParticipantIdentity,
} from '@/modules/participant-access/domain/participant-access';
import {
  CurrentParticipant,
  ParticipantSessionGuard,
} from '@/modules/participant-access/guards/participant-session.guard';
import {
  ParticipantProfileDto,
  UpdateParticipantProfileDto,
} from '@/modules/participant-profile/dto/participant-profile.dto';
import { ParticipantProfileService } from '@/modules/participant-profile/services/participant-profile.service';
import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('participant profile')
@ApiCookieAuth(PARTICIPANT_SESSION_COOKIE)
@ApiResponse({ status: 401, description: '`participant_session_required`' })
@Controller('participant/profile')
@UseGuards(ParticipantSessionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ParticipantProfileController {
  constructor(private readonly profiles: ParticipantProfileService) {}

  @Get()
  @ApiOperation({
    summary: 'The profile of the signed-in participant',
    description: 'Unfilled values are `null`; the e-mail is the sign-in one.',
  })
  @ApiResponse({ status: 200, type: ParticipantProfileDto })
  async read(
    @CurrentParticipant() participant: ParticipantIdentity,
  ): Promise<ParticipantProfileDto> {
    return ParticipantProfileDto.fromModel(
      await this.profiles.read(participant),
    );
  }

  @Put()
  @ApiOperation({
    summary: 'Replace the profile of the signed-in participant',
    description:
      'Every field is optional; a missing, `null` or empty one is cleared. ' +
      'The e-mail and existing registrations stay unchanged.',
  })
  @ApiResponse({ status: 200, type: ParticipantProfileDto })
  @ApiResponse({ status: 400, description: 'Invalid name or phone.' })
  async save(
    @CurrentParticipant() participant: ParticipantIdentity,
    @Body() dto: UpdateParticipantProfileDto,
  ): Promise<ParticipantProfileDto> {
    return ParticipantProfileDto.fromModel(
      await this.profiles.save(participant, {
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        phone: dto.phone ?? null,
      }),
    );
  }
}
