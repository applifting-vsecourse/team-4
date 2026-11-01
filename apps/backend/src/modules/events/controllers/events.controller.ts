import { EventInputDto } from '@/modules/events/dto/event-input.dto';
import {
  EventDetailDto,
  EventSummaryDto,
} from '@/modules/events/dto/event.dto';
import { PublicationInputDto } from '@/modules/events/dto/publication-input.dto';
import { EventsService } from '@/modules/events/services/events.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('events')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Events of an own organization, newest first' })
  async list(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<EventSummaryDto[]> {
    return (await this.events.list(organizationId, user.id)).map(
      EventSummaryDto.from,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft event without terms' })
  async create(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: EventInputDto,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.events.create(organizationId, user.id, dto),
    );
  }

  @Get(':eventId')
  @ApiOperation({ summary: 'An event with its terms' })
  async get(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.events.get({ organizationId, ownerId: user.id, eventId }),
    );
  }

  @Post(':eventId/open-registration')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Open registration for the whole event',
    description:
      'Draft → open, once and without a confirmation step. From then on name, ' +
      'description, location and terms are locked. 409 ' +
      '`opening_conditions_not_met` with `blockers` when something is missing; ' +
      'nothing is saved then. Opening an open event again changes nothing. ' +
      'Returns the event.',
  })
  async openRegistration(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.events.openRegistration({
        organizationId,
        ownerId: user.id,
        eventId,
      }),
    );
  }

  @Put(':eventId/publication')
  @ApiOperation({
    summary: 'Publish the event to the public catalog or withdraw it',
    description:
      'Allowed at any time and independent of the registration status: it ' +
      'neither opens nor closes registration, and the public registration ' +
      'link keeps working. A new event is not published. Returns the event.',
  })
  async setPublication(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: PublicationInputDto,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.events.setPublished(
        { organizationId, ownerId: user.id, eventId },
        dto.isPublished,
      ),
    );
  }

  @Put(':eventId')
  @ApiOperation({
    summary: 'Edit name, description and location',
    description: '409 `event_locked` once registration has been opened.',
  })
  async update(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: EventInputDto,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.events.update(
        { organizationId, ownerId: user.id, eventId },
        dto,
      ),
    );
  }
}
