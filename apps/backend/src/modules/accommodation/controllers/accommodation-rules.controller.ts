import {
  HardAttributeSettingDto,
  RoomProposalPreferencesDto,
  SaveHardAttributeDto,
  SaveRoomProposalPreferencesDto,
} from '@/modules/accommodation/dto/accommodation-rules.dto';
import { AccommodationRulesService } from '@/modules/accommodation/services/accommodation-rules.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
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

// Pravidla ubytování (#384, #389): the hard attribute of an event and the
// soft preferences of its room proposal. Every route is
// 404 for a foreign or missing organization or event.
@ApiTags('accommodation')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/accommodation')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AccommodationRulesController {
  constructor(private readonly rules: AccommodationRulesService) {}

  @Get('hard-attribute')
  @ApiOperation({ summary: 'The hard attribute of the event and the options' })
  async hardAttribute(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<HardAttributeSettingDto> {
    return HardAttributeSettingDto.from(
      await this.rules.hardAttribute({
        organizationId,
        ownerId: user.id,
        eventId,
      }),
    );
  }

  @Put('hard-attribute')
  @ApiOperation({
    summary: 'Chooses the hard attribute, or none',
    description:
      'A change makes the evaluation and the room proposal of every term ' +
      'stale; in the automatic modes each runs again 10 s later. It ' +
      'confirms, cancels and moves nobody, and removes the attribute from ' +
      'the soft preferences. Saving the current choice changes nothing.',
  })
  async saveHardAttribute(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: SaveHardAttributeDto,
  ): Promise<HardAttributeSettingDto> {
    return HardAttributeSettingDto.from(
      await this.rules.saveHardAttribute(
        { organizationId, ownerId: user.id, eventId },
        body.hardAttribute,
      ),
    );
  }

  @Get('room-proposal-preferences')
  @ApiOperation({
    summary: 'The ranked soft preferences of the room proposal',
  })
  async preferences(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<RoomProposalPreferencesDto> {
    return RoomProposalPreferencesDto.from(
      await this.rules.preferences({
        organizationId,
        ownerId: user.id,
        eventId,
      }),
    );
  }

  @Put('room-proposal-preferences')
  @ApiOperation({
    summary: 'Ranks the soft preferences and sets their neutral answers',
    description:
      'A change makes the room proposal of every term stale; with ' +
      'automatic proposals on each is proposed again 10 s later. The ' +
      'evaluation of participation does not change. 400 for an unknown or ' +
      'repeated item or answer; 409 when the list contains the hard ' +
      'attribute. Saving the current list changes nothing.',
  })
  async savePreferences(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: SaveRoomProposalPreferencesDto,
  ): Promise<RoomProposalPreferencesDto> {
    return RoomProposalPreferencesDto.from(
      await this.rules.savePreferences(
        { organizationId, ownerId: user.id, eventId },
        body.preferences,
      ),
    );
  }
}
