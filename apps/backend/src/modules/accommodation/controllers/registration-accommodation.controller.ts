import {
  DetermineAccommodationDto,
  RegistrationAccommodationDto,
} from '@/modules/accommodation/dto/registration-accommodation.dto';
import { RegistrationAccommodationService } from '@/modules/accommodation/services/registration-accommodation.service';
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

// The accommodation of one registration in the organizer's detail (S3-01):
// the answer to the hard attribute and its manual determination. 404 for a
// registration of another event, organization or owner.
@ApiTags('accommodation')
@ApiCookieAuth('better-auth.session_token')
@Controller(
  'organizations/:organizationId/events/:eventId/registrations/:registrationId/accommodation',
)
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RegistrationAccommodationController {
  constructor(
    private readonly accommodation: RegistrationAccommodationService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'The answer, the determination and its history',
  })
  async get(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
  ): Promise<RegistrationAccommodationDto> {
    return RegistrationAccommodationDto.from(
      await this.accommodation.get(
        { organizationId, ownerId: user.id, eventId },
        registrationId,
      ),
    );
  }

  @Put('determination')
  @ApiOperation({
    summary: 'Determines the effective value, with a reason',
    description:
      'For every term of the registration, until the answer changes; the ' +
      'answer itself stays. Recorded with its author, time, reason and the ' +
      'value before; the terms’ proposals turn stale. The same value again ' +
      'records nothing, not even a new reason. Any change of the answer ' +
      'cancels it. 409 `answer_changed` (not the `answer` sent), 409 ' +
      '`no_hard_attribute`, 409 `determination_not_needed` (the answer ' +
      'already determines the room), 400 `value_invalid`.',
  })
  async determine(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body() body: DetermineAccommodationDto,
  ): Promise<RegistrationAccommodationDto> {
    return RegistrationAccommodationDto.from(
      await this.accommodation.determine(
        { organizationId, ownerId: user.id, eventId },
        registrationId,
        body,
      ),
    );
  }
}
