import {
  HardAttributeSettingDto,
  SaveHardAttributeDto,
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

// Pravidla ubytování (#384): the hard attribute of an event. Every route is
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
      'A change makes the evaluation of every term stale; in the automatic ' +
      'mode each term is evaluated again 10 s later. It confirms, cancels ' +
      'and moves nobody. Saving the current choice changes nothing.',
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
}
