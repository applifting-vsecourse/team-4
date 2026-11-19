import { OrganizerRoommateWishesDto } from '@/modules/registrations/dto/roommate-wishes.dto';
import { RoommateWishesService } from '@/modules/registrations/services/roommate-wishes.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

// The organizer reads a registration's roommate wishes (S4-05, #339).
@ApiTags('registrations')
@ApiCookieAuth('better-auth.session_token')
@Controller(
  'organizations/:organizationId/events/:eventId/registrations/:registrationId/roommate-wishes',
)
@UseGuards(AuthenticatedUserGuard)
export class EventRoommateWishesController {
  constructor(private readonly wishes: RoommateWishesService) {}

  @Get()
  @ApiOperation({
    summary: 'The roommate wishes of a registration',
    description:
      '404 for a registration of another event or organization, the same ' +
      'as a missing one.',
  })
  async get(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
  ): Promise<OrganizerRoommateWishesDto> {
    return OrganizerRoommateWishesDto.from(
      await this.wishes.forOrganizer(
        { organizationId, ownerId: user.id, eventId },
        registrationId,
      ),
    );
  }
}
