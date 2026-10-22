import {
  RegistrationDetailDto,
  RegistrationListDto,
} from '@/modules/registrations/dto/managed-registration.dto';
import { RegistrationFilterDto } from '@/modules/registrations/dto/registration-filter.dto';
import { EventRegistrationsService } from '@/modules/registrations/services/event-registrations.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// The organizer's view of the registrations of one event (S2-11).
@ApiTags('registrations')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/registrations')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class EventRegistrationsController {
  constructor(private readonly registrations: EventRegistrationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Registrations of an event, oldest first',
    description:
      'Filters combine. With `termId` and `status` both must hold for the ' +
      'same term; `status` alone matches any term. A registration is listed ' +
      'once. 404 for a foreign or missing event.',
  })
  async list(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() filter: RegistrationFilterDto,
  ): Promise<RegistrationListDto> {
    return RegistrationListDto.from(
      await this.registrations.list(
        { organizationId, ownerId: user.id, eventId },
        filter,
      ),
    );
  }

  @Get(':registrationId')
  @ApiOperation({
    summary: 'One registration with its payments and balance',
    description:
      '404 for a registration of another event or organization, the same ' +
      'as a missing one.',
  })
  async get(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
  ): Promise<RegistrationDetailDto> {
    return RegistrationDetailDto.from(
      await this.registrations.get(
        { organizationId, ownerId: user.id, eventId },
        registrationId,
      ),
    );
  }
}
