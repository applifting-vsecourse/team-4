import {
  LockPlacementDto,
  PlaceInRoomDto,
  TermPlacementsDto,
} from '@/modules/accommodation/dto/room-placements.dto';
import { RoomPlacementsService } from '@/modules/accommodation/services/room-placements.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// Manual placement into rooms of one term (F14-2, #337). Every change answers
// with the term's rooms as they are after it. A placement never changes the
// person's participation, the order of the term or an evaluation. 404 for a
// term, room or registration outside the organizer's event.
@ApiTags('accommodation')
@ApiCookieAuth('better-auth.session_token')
@Controller(
  'organizations/:organizationId/events/:eventId/accommodation/terms/:termId/placements',
)
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RoomPlacementsController {
  constructor(private readonly placements: RoomPlacementsService) {}

  @Get()
  @ApiResponse({ status: 200, type: TermPlacementsDto })
  @ApiOperation({
    summary:
      'The rooms of the term, their people and warnings, and who has none',
  })
  async get(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ): Promise<TermPlacementsDto> {
    return TermPlacementsDto.from(
      await this.placements.get(
        { organizationId, ownerId: user.id, eventId },
        termId,
      ),
    );
  }

  @Put(':registrationId')
  @ApiResponse({ status: 200, type: TermPlacementsDto })
  @ApiOperation({
    summary: 'Places a confirmed participant into a room, or moves them',
    description:
      'The same room again changes nothing but `lock`. 409 ' +
      '`placement_warnings` (with `warnings`) unless `confirmWarnings` ' +
      'covers them; 409 ' +
      '`participant_not_confirmed`, `room_unavailable`, `placement_locked`.',
  })
  async place(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body() body: PlaceInRoomDto,
  ): Promise<TermPlacementsDto> {
    return TermPlacementsDto.from(
      await this.placements.place(
        { organizationId, ownerId: user.id, eventId },
        termId,
        registrationId,
        {
          roomId: body.roomId,
          confirmWarnings: body.confirmWarnings ?? [],
          lock: body.lock,
        },
      ),
    );
  }

  @Delete(':registrationId')
  @ApiResponse({ status: 200, type: TermPlacementsDto })
  @ApiOperation({
    summary: 'Takes the person out of their room',
    description:
      'Nothing changes for someone without a room. 409 `placement_locked`.',
  })
  async remove(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
  ): Promise<TermPlacementsDto> {
    return TermPlacementsDto.from(
      await this.placements.remove(
        { organizationId, ownerId: user.id, eventId },
        termId,
        registrationId,
      ),
    );
  }

  @Put(':registrationId/lock')
  @ApiResponse({ status: 200, type: TermPlacementsDto })
  @ApiOperation({
    summary: 'Locks or unlocks the person’s placement',
    description:
      'A locked placement is kept by the room proposal and refuses manual ' +
      'moves and removal. 409 `not_placed`; locking also ' +
      '`participant_not_confirmed`.',
  })
  async lock(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Body() body: LockPlacementDto,
  ): Promise<TermPlacementsDto> {
    return TermPlacementsDto.from(
      await this.placements.lock(
        { organizationId, ownerId: user.id, eventId },
        termId,
        registrationId,
        body.isLocked,
      ),
    );
  }
}
