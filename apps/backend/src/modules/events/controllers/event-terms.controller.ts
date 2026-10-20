import { EventDetailDto } from '@/modules/events/dto/event.dto';
import { TermInputDto } from '@/modules/events/dto/term-input.dto';
import { EventsService } from '@/modules/events/services/events.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

const LOCK_AND_OVERLAP =
  '400 `term_dates` when the end is before the start, 409 `term_overlap` ' +
  'when it shares a day with another term of the event, 409 `event_locked` ' +
  'once registration has been opened. Returns the event with all its terms.';

@ApiTags('events')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/terms')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class EventTermsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a term', description: LOCK_AND_OVERLAP })
  async add(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: TermInputDto,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.events.addTerm(
        { organizationId, ownerId: user.id, eventId },
        dto,
      ),
    );
  }

  @Put(':termId')
  @ApiOperation({ summary: 'Edit a term', description: LOCK_AND_OVERLAP })
  async update(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Body() dto: TermInputDto,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.events.updateTerm(
        { organizationId, ownerId: user.id, eventId },
        termId,
        dto,
      ),
    );
  }

  @Delete(':termId')
  @ApiOperation({
    summary: 'Remove a term',
    description:
      '409 `event_locked` once registration has been opened. Returns the event with the remaining terms.',
  })
  async remove(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<EventDetailDto> {
    return EventDetailDto.from(
      await this.events.removeTerm(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }
}
