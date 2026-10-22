import { RoomInputDto } from '@/modules/rooms/dto/room-input.dto';
import { RoomsOverviewDto } from '@/modules/rooms/dto/rooms-overview.dto';
import { RoomsService } from '@/modules/rooms/services/rooms.service';
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
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

const CAPACITY_RULES =
  '409 `room_label_taken` for a label already used in the event (ignoring ' +
  'case and outer spaces), 409 `capacity_below_confirmed` when a term would ' +
  'drop below its confirmed participants (nothing is saved then), 400 ' +
  '`term_unknown` for a term of another event. Returns the rooms overview.';

@ApiTags('rooms')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/rooms')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  @ApiOperation({
    summary: 'Rooms of an event and the capacity and occupancy of each term',
  })
  async get(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<RoomsOverviewDto> {
    return RoomsOverviewDto.from(
      await this.rooms.get({ organizationId, ownerId: user.id, eventId }),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Add a room', description: CAPACITY_RULES })
  async add(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: RoomInputDto,
  ): Promise<RoomsOverviewDto> {
    return RoomsOverviewDto.from(
      await this.rooms.add({ organizationId, ownerId: user.id, eventId }, dto),
    );
  }

  @Put(':roomId')
  @ApiOperation({ summary: 'Edit a room', description: CAPACITY_RULES })
  async update(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: RoomInputDto,
  ): Promise<RoomsOverviewDto> {
    return RoomsOverviewDto.from(
      await this.rooms.update(
        { organizationId, ownerId: user.id, eventId },
        roomId,
        dto,
      ),
    );
  }

  @Delete(':roomId')
  @ApiOperation({
    summary: 'Remove a room',
    description:
      '409 `capacity_below_confirmed` when a term would drop below its ' +
      'confirmed participants (the room is kept). Returns the rooms overview.',
  })
  async remove(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ): Promise<RoomsOverviewDto> {
    return RoomsOverviewDto.from(
      await this.rooms.remove(
        { organizationId, ownerId: user.id, eventId },
        roomId,
      ),
    );
  }
}
