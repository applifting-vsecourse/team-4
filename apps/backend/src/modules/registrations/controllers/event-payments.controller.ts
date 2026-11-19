import { EventPaymentsDto } from '@/modules/registrations/dto/event-payments.dto';
import { EventPaymentsService } from '@/modules/registrations/services/event-payments.service';
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

// Správa akce → Platby: received payments and balances of registrations (S4-09).
@ApiTags('registrations')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/payments')
@UseGuards(AuthenticatedUserGuard)
export class EventPaymentsController {
  constructor(private readonly payments: EventPaymentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Received payments and balances of an event',
    description:
      'Amounts are computed as in the registration list and detail. ' +
      'Registrations with nothing due and nothing paid have no balance. ' +
      '404 for a foreign or missing event.',
  })
  async overview(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<EventPaymentsDto> {
    return EventPaymentsDto.from(
      await this.payments.overview({
        organizationId,
        ownerId: user.id,
        eventId,
      }),
    );
  }
}
