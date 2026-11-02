import { ChangeApprovalInputDto } from '@/modules/events/dto/change-approval-input.dto';
import { EventDetailDto } from '@/modules/events/dto/event.dto';
import { EventsService } from '@/modules/events/services/events.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
  UsePipes,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

const fieldError = (errors: ValidationError[]): BadRequestException => {
  const first = errors[0];
  return new BadRequestException({
    statusCode: 400,
    code: 'change_approval_invalid',
    field: first?.property,
    message: Object.values(first?.constraints ?? {})[0] ?? 'Neplatný údaj.',
  });
};

@ApiTags('events')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/change-approval')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: fieldError,
  }),
)
export class EventChangeApprovalController {
  constructor(private readonly events: EventsService) {}

  @Put()
  @ApiOperation({
    summary: 'Set the threshold from which registration changes need approval',
    description:
      'Allowed at any time. `days: null` removes the setting. ' +
      '400 with `field` for a negative, decimal or non-numeric value. Returns the event.',
  })
  async update(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: ChangeApprovalInputDto,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.events.setChangeApprovalDays(
        { organizationId, ownerId: user.id, eventId },
        dto.days ?? null,
      ),
    );
  }
}
