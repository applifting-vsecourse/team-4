import { EventDetailDto } from '@/modules/events/dto/event.dto';
import { PresentationInputDto } from '@/modules/events/dto/presentation-input.dto';
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
    code: 'presentation_invalid',
    field: first?.property,
    message: Object.values(first?.constraints ?? {})[0] ?? 'Neplatný údaj.',
  });
};

@ApiTags('events')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/presentation')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: fieldError,
  }),
)
export class EventPresentationController {
  constructor(private readonly events: EventsService) {}

  @Put()
  @ApiOperation({
    summary:
      'Set the description, conditions and public contact of the catalog detail',
    description:
      'Conditions and contact are editable at any time; the description only ' +
      'until the first opening (409 `event_locked`). Empty name, e-mail and ' +
      'phone remove the public contact. 400 with `field` for an invalid value. ' +
      'Returns the event.',
  })
  async update(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: PresentationInputDto,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.events.updatePresentation(
        { organizationId, ownerId: user.id, eventId },
        {
          description: dto.description,
          conditions: dto.conditions,
          contact:
            dto.contactName === ''
              ? null
              : {
                  name: dto.contactName,
                  email: dto.contactEmail,
                  phone: dto.contactPhone === '' ? null : dto.contactPhone,
                },
        },
      ),
    );
  }
}
