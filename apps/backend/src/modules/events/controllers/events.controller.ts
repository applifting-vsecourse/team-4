import { EventInputDto } from '@/modules/events/dto/event-input.dto';
import {
  EventDetailDto,
  EventSummaryDto,
} from '@/modules/events/dto/event.dto';
import { EventsService } from '@/modules/events/services/events.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
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
